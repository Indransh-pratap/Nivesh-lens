"""
Admin AMFI Master Data Management Endpoints.
Only accessible by authenticated administrative / developer accounts.
Endpoints:
- GET  /api/admin/amfi/status
- POST /api/admin/amfi/preview
- POST /api/admin/amfi/import
"""
from datetime import date, datetime
import hashlib
import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_user_id
from app.db.dependencies import get_db
from app.models.market_data import DataSyncRecord, FundScheme, SchemeHolding
from app.services.amfi.parser import parse_portfolio_xlsx
from app.services.amfi.provider import AMFIPortfolioProvider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/amfi")


class AMFIStatusResponse(BaseModel):
    latest_statement_date: str | None
    last_ingestion_time: str | None
    schemes_count: int
    holdings_count: int
    database_status: str
    recent_syncs: list[dict]


class AMFIPreviewResponse(BaseModel):
    filename: str
    filesize_bytes: int
    checksum: str
    schemes_detected: int
    holdings_detected: int
    as_of_date: str | None
    is_duplicate: bool
    duplicate_reason: str | None
    sample_schemes: list[str]


class AMFIImportResponse(BaseModel):
    status: str
    message: str
    schemes_imported: int
    holdings_imported: int
    rows_skipped: int
    errors_warnings: list[str]
    statement_date: str | None
    ingestion_timestamp: str


@router.get("/status", response_model=AMFIStatusResponse)
def get_amfi_data_status(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """Returns current AMFI master data status in PostgreSQL."""
    schemes_count = db.query(func.count(FundScheme.id)).scalar() or 0
    holdings_count = db.query(func.count(SchemeHolding.id)).scalar() or 0
    latest_date = db.query(func.max(SchemeHolding.as_of_date)).scalar()

    latest_sync = (
        db.query(DataSyncRecord)
        .filter(DataSyncRecord.source.like("AMFI%"))
        .order_by(DataSyncRecord.fetched_at.desc())
        .first()
    )

    if schemes_count == 0 or holdings_count == 0:
        db_status = "EMPTY"
    elif latest_date and (date.today() - latest_date).days > 65:
        db_status = "OUTDATED"
    else:
        db_status = "HEALTHY"

    sync_records = (
        db.query(DataSyncRecord)
        .filter(DataSyncRecord.source.like("AMFI%"))
        .order_by(DataSyncRecord.fetched_at.desc())
        .limit(5)
        .all()
    )

    recent_syncs = [
        {
            "id": str(r.id),
            "source": r.source,
            "provider": r.provider,
            "fetched_at": r.fetched_at.isoformat() if r.fetched_at else None,
            "as_of_date": r.as_of_date.isoformat() if r.as_of_date else None,
            "status": r.status,
            "details": r.details,
        }
        for r in sync_records
    ]

    return {
        "latest_statement_date": latest_date.isoformat() if latest_date else None,
        "last_ingestion_time": latest_sync.fetched_at.isoformat() if (latest_sync and latest_sync.fetched_at) else None,
        "schemes_count": schemes_count,
        "holdings_count": holdings_count,
        "database_status": db_status,
        "recent_syncs": recent_syncs,
    }


@router.post("/preview", response_model=AMFIPreviewResponse)
async def preview_amfi_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """
    Parses uploaded AMFI Excel in-memory to detect schemes, holdings, and potential duplicates
    BEFORE committing to the database.
    """
    filename = file.filename or "amfi_portfolio.xlsx"
    if not (filename.lower().endswith(".xlsx") or filename.lower().endswith(".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supported formats are .xlsx and .xls",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    checksum = hashlib.sha256(content).hexdigest()

    try:
        portfolios = parse_portfolio_xlsx(content)
    except Exception as exc:
        logger.error(f"AMFI file parse failed: {exc}")
        raise HTTPException(
            status_code=400,
            detail=f"Unable to parse AMFI portfolio workbook: {str(exc)}",
        )

    if not portfolios:
        raise HTTPException(
            status_code=400,
            detail="No valid mutual fund portfolio disclosure sheets found in workbook.",
        )

    total_holdings = sum(len(p.holdings) for p in portfolios)
    as_of_date = max((p.as_of_date for p in portfolios), default=date.today())

    existing_checksum_record = (
        db.query(DataSyncRecord)
        .filter(DataSyncRecord.checksum == checksum)
        .first()
    )

    scheme_codes = [p.scheme_code for p in portfolios[:10]]
    existing_holdings_count = (
        db.query(func.count(SchemeHolding.id))
        .join(FundScheme, SchemeHolding.scheme_id == FundScheme.id)
        .filter(FundScheme.scheme_code.in_(scheme_codes), SchemeHolding.as_of_date == as_of_date)
        .scalar()
        or 0
    )

    is_duplicate = False
    duplicate_reason = None
    if existing_checksum_record:
        is_duplicate = True
        duplicate_reason = f"Exact file was previously ingested on {existing_checksum_record.fetched_at.strftime('%d %b %Y %H:%M')}"
    elif existing_holdings_count > 50:
        is_duplicate = True
        duplicate_reason = f"Portfolio disclosures for statement date {as_of_date.strftime('%d %b %Y')} are already present in the database."

    sample_schemes = [f"{p.scheme_code} - {p.scheme_name}" for p in portfolios[:5]]

    return {
        "filename": filename,
        "filesize_bytes": len(content),
        "checksum": checksum,
        "schemes_detected": len(portfolios),
        "holdings_detected": total_holdings,
        "as_of_date": as_of_date.isoformat() if as_of_date else None,
        "is_duplicate": is_duplicate,
        "duplicate_reason": duplicate_reason,
        "sample_schemes": sample_schemes,
    }


@router.post("/import", response_model=AMFIImportResponse)
async def import_amfi_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """
    Ingests, normalizes, validates, and stores AMFI monthly portfolio disclosures into PostgreSQL.
    Re-ingesting existing statement dates replaces holdings idempotently without duplicate rows.
    """
    filename = file.filename or "amfi_portfolio.xlsx"
    if not (filename.lower().endswith(".xlsx") or filename.lower().endswith(".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supported formats are .xlsx and .xls",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    provider = AMFIPortfolioProvider(db=db)
    try:
        result = provider.ingest_monthly_data(content=content, auto_create_schemes=True)
    except Exception as exc:
        logger.error(f"Error during AMFI ingestion: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to ingest AMFI portfolio data: {str(exc)}",
        )

    max_date = db.query(func.max(SchemeHolding.as_of_date)).scalar()

    return {
        "status": "SUCCESS",
        "message": "AMFI portfolio data imported successfully.",
        "schemes_imported": result.get("imported_schemes", 0),
        "holdings_imported": result.get("total_holdings", 0),
        "rows_skipped": result.get("skipped_schemes", 0),
        "errors_warnings": result.get("skipped_scheme_codes", []),
        "statement_date": max_date.isoformat() if max_date else None,
        "ingestion_timestamp": datetime.utcnow().isoformat() + "Z",
    }