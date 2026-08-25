import hashlib
import os
import tempfile
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import UploadFile
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.holding import Holding
from app.models.import_record import ImportRecord, ImportStatus, SourceType
from app.models.portfolio import Portfolio
from app.models.transaction import Transaction
from app.services.cas.decrypt import CasPdfError, decrypt_cas_pdf
from app.services.cas.detector import UnsupportedCASError, detect_cas_format
from app.services.cas.normalizer import CasNormalizationError, normalize_cas, normalize_security_name
from app.services.cas.parser import CasParseError, parse_cas

MAX_UPLOAD_BYTES = 25 * 1024 * 1024


class CasImportError(Exception):
    def __init__(self, code: str, message: str):
        self.code, self.message = code, message
        super().__init__(message)


async def save_temp_pdf(upload: UploadFile) -> tuple[str, str]:
    if upload.content_type not in {"application/pdf", "application/x-pdf"}:
        raise CasImportError("INVALID_PDF", "Please upload a PDF file")
    fd, path = tempfile.mkstemp(prefix="nivesh-cas-", suffix=".pdf")
    digest = hashlib.sha256()
    size = 0
    try:
        with os.fdopen(fd, "wb") as target:
            while chunk := await upload.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise CasImportError("INVALID_PDF", "PDF exceeds the 25 MB upload limit")
                digest.update(chunk)
                target.write(chunk)
        with open(path, "rb") as source:
            pdf_signature = source.read(5)
        if size < 5 or not pdf_signature.startswith(b"%PDF-"):
            raise CasImportError("INVALID_PDF", "Uploaded file is not a valid PDF")
        return path, digest.hexdigest()
    except Exception:
        if os.path.exists(path):
            os.unlink(path)
        raise


def _portfolio(db: Session, user_id: str) -> Portfolio:
    portfolio = db.scalar(select(Portfolio).where(Portfolio.user_id == user_id, Portfolio.name == "CAS Portfolio"))
    if portfolio is None:
        portfolio = Portfolio(user_id=user_id, name="CAS Portfolio")
        db.add(portfolio)
        db.flush()
    return portfolio


def import_cas(db: Session, user_id: str, file_name: str | None, document_hash: str, text: str) -> dict:
    existing = db.scalar(select(ImportRecord).where(ImportRecord.user_id == user_id, ImportRecord.source_type == SourceType.CAS, ImportRecord.document_hash == document_hash, ImportRecord.status == ImportStatus.COMPLETED))
    if existing:
        return {"status": "already_imported", "import_id": str(existing.id), "portfolio_id": str(existing.portfolio_id)}
    failed = db.scalar(select(ImportRecord).where(ImportRecord.user_id == user_id, ImportRecord.source_type == SourceType.CAS, ImportRecord.document_hash == document_hash, ImportRecord.status == ImportStatus.FAILED))
    if failed:
        db.delete(failed)
        db.flush()
    portfolio = _portfolio(db, user_id)
    record = ImportRecord(portfolio_id=portfolio.id, user_id=user_id, source_type=SourceType.CAS, file_name=(file_name or "cas.pdf")[:255], document_hash=document_hash, status=ImportStatus.PROCESSING)
    db.add(record)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        existing = db.scalar(select(ImportRecord).where(ImportRecord.user_id == user_id, ImportRecord.source_type == SourceType.CAS, ImportRecord.document_hash == document_hash))
        if existing:
            return {"status": "already_imported", "import_id": str(existing.id), "portfolio_id": str(existing.portfolio_id)}
        raise
    try:
        normalized = normalize_cas(parse_cas(text, detect_cas_format(text)))
        if not normalized.holdings:
            raise CasImportError("EMPTY_CAS", "CAS contains no holdings")
        db.execute(delete(Transaction).where(Transaction.portfolio_id == portfolio.id))
        db.execute(delete(Holding).where(Holding.portfolio_id == portfolio.id))
        holding_by_key: dict[str, Holding] = {}
        total = Decimal("0")
        for item in normalized.holdings:
            holding = Holding(portfolio_id=portfolio.id, asset_type=item.asset_type, name=item.name, isin=item.isin, quantity=item.units, average_price=item.average_cost, current_price=item.current_price, invested_value=item.average_cost * item.units, current_value=item.current_value)
            db.add(holding)
            db.flush()
            holding_by_key[item.isin or normalize_security_name(item.name)] = holding
            total += item.current_value
        for item in normalized.transactions:
            holding = holding_by_key.get(item.isin or normalize_security_name(item.security_name))
            db.add(Transaction(portfolio_id=portfolio.id, holding_id=holding.id if holding else None, transaction_type=item.transaction_type, transaction_date=item.date, quantity=item.units, price=(item.amount / item.units if item.units else Decimal("0")), amount=item.amount))
        portfolio.total_value = total
        record.statement_period = normalized.statement_period
        record.status = ImportStatus.COMPLETED
        record.completed_at = datetime.now(timezone.utc)
        db.commit()
        return {"status": "completed", "import_id": str(record.id), "portfolio_id": str(portfolio.id)}
    except (CasPdfError, UnsupportedCASError, CasParseError, CasNormalizationError, CasImportError) as error:
        db.rollback()
        # A failed record is committed separately so it remains auditable without retaining sensitive source data.
        failed_portfolio = _portfolio(db, user_id)
        record = ImportRecord(portfolio_id=failed_portfolio.id, user_id=user_id, source_type=SourceType.CAS, file_name=(file_name or "cas.pdf")[:255], document_hash=document_hash, status=ImportStatus.FAILED, error_code=getattr(error, "code", "CAS_PARSE_FAILED"), error_message=str(error)[:500], completed_at=datetime.now(timezone.utc))
        db.add(record)
        db.commit()
        raise CasImportError(record.error_code or "IMPORT_FAILED", "We could not import this CAS") from error
