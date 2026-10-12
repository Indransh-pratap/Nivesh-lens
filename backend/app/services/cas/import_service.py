import hashlib
import logging
import os
import tempfile
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import UploadFile
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.holding import Holding
from app.models.import_record import (
    ImportRecord,
    ImportStatus,
    SourceType,
)
from app.models.portfolio import Portfolio
from app.models.transaction import Transaction
from app.services.cas.decrypt import (
    CasPdfError,
    decrypt_cas_pdf,
)
from app.services.cas.detector import (
    UnsupportedCASError,
    detect_cas_format,
)
from app.services.cas.normalizer import (
    CasNormalizationError,
    normalize_cas,
    normalize_security_name,
)
from app.services.cas.parser import (
    CasParseError,
    parse_cas,
)

logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 25 * 1024 * 1024


class CasImportError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


# ============================================================
# PDF UPLOAD
# ============================================================

async def save_temp_pdf(upload: UploadFile) -> tuple[str, str]:
    if upload.content_type not in {
        "application/pdf",
        "application/x-pdf",
    }:
        raise CasImportError(
            "INVALID_PDF",
            "Please upload a PDF file",
        )

    fd, path = tempfile.mkstemp(
        prefix="nivesh-cas-",
        suffix=".pdf",
    )

    digest = hashlib.sha256()
    size = 0

    try:
        with os.fdopen(fd, "wb") as target:
            while True:
                chunk = await upload.read(1024 * 1024)

                if not chunk:
                    break

                size += len(chunk)

                if size > MAX_UPLOAD_BYTES:
                    raise CasImportError(
                        "INVALID_PDF",
                        "PDF exceeds the 25 MB upload limit",
                    )

                digest.update(chunk)
                target.write(chunk)

        with open(path, "rb") as source:
            signature = source.read(5)

        if size < 5 or not signature.startswith(b"%PDF-"):
            raise CasImportError(
                "INVALID_PDF",
                "Uploaded file is not a valid PDF",
            )

        return path, digest.hexdigest()

    except Exception:
        if os.path.exists(path):
            os.unlink(path)
        raise


# ============================================================
# PORTFOLIO
# ============================================================

def _portfolio(db: Session, user_id: str) -> Portfolio:
    portfolio = db.scalar(
        select(Portfolio).where(
            Portfolio.user_id == user_id,
            Portfolio.name == "CAS Portfolio",
        )
    )

    if portfolio is None:
        portfolio = Portfolio(
            user_id=user_id,
            name="CAS Portfolio",
            total_value=Decimal("0"),
        )
        db.add(portfolio)
        db.flush()

    return portfolio


# ============================================================
# SERIALIZATION
# ============================================================

def _decimal_float(value) -> float:
    if value is None:
        return 0.0

    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _serialize_holding(holding: Holding) -> dict:
    asset_type = getattr(holding, "asset_type", None)

    if hasattr(asset_type, "value"):
        asset_type = asset_type.value
    elif asset_type is not None:
        asset_type = str(asset_type)

    quantity = getattr(holding, "quantity", None)
    average_price = getattr(holding, "average_price", None)
    current_price = getattr(holding, "current_price", None)
    invested_value = getattr(holding, "invested_value", None)
    current_value = getattr(holding, "current_value", None)

    return {
        "id": str(holding.id),
        "name": holding.name,
        "isin": holding.isin,
        "ticker": holding.isin[:6] if holding.isin else None,
        "units": _decimal_float(quantity),
        "quantity": _decimal_float(quantity),
        "averageCost": _decimal_float(average_price),
        "average_cost": _decimal_float(average_price),
        "currentPrice": _decimal_float(current_price),
        "current_price": _decimal_float(current_price),
        "investedValue": _decimal_float(invested_value),
        "invested_value": _decimal_float(invested_value),
        "currentValue": _decimal_float(current_value),
        "current_value": _decimal_float(current_value),
        "assetType": asset_type,
        "asset_type": asset_type,
        "returns": 0.0,
        "returnsValue": 0.0,
        "returns_value": 0.0,
        "planType": "Direct",
        "expenseRatio": 0.0,
        "expense_ratio": 0.0,
        "riskGrade": "Low",
        "risk_grade": "Low",
    }


def _portfolio_holdings(db: Session, portfolio_id) -> list[dict]:
    holdings = db.scalars(
        select(Holding)
        .where(Holding.portfolio_id == portfolio_id)
        .order_by(Holding.name)
    ).all()

    return [_serialize_holding(holding) for holding in holdings]


def _completed_response(
    db: Session,
    record: ImportRecord,
    portfolio: Portfolio,
    *,
    status: str = "completed",
) -> dict:
    holdings = _portfolio_holdings(db, portfolio.id)

    transactions_count = len(
        db.scalars(
            select(Transaction).where(
                Transaction.portfolio_id == portfolio.id
            )
        ).all()
    )

    return {
        "success": True,
        "status": status,
        "import_id": str(record.id),
        "portfolio_id": str(portfolio.id),
        "holdings_count": len(holdings),
        "transactions_count": transactions_count,
        "holdings": holdings,
        "total_value": _decimal_float(portfolio.total_value),
    }


# ============================================================
# MAIN CAS IMPORT
# ============================================================

def import_cas(
    db: Session,
    user_id: str,
    file_name: str | None,
    document_hash: str,
    text: str,
) -> dict:
    now = datetime.now(timezone.utc)
    file_name = (file_name or "cas.pdf")[:255]

    try:
        # Always use the same CAS portfolio for this user.
        portfolio = _portfolio(db, user_id)

        # Idempotency: return an already completed identical import.
        existing = db.scalar(
            select(ImportRecord).where(
                ImportRecord.user_id == user_id,
                ImportRecord.source_type == SourceType.CAS,
                ImportRecord.document_hash == document_hash,
            )
        )

        if (
            existing is not None
            and existing.status == ImportStatus.COMPLETED
        ):
            existing_portfolio = db.get(
                Portfolio,
                existing.portfolio_id,
            )

            if existing_portfolio is not None:
                return _completed_response(
                    db,
                    existing,
                    existing_portfolio,
                    status="already_imported",
                )

        # Parse and validate BEFORE deleting existing data.
        cas_format = detect_cas_format(text)
        parsed = parse_cas(text, cas_format)
        normalized = normalize_cas(parsed)

        if not normalized.holdings:
            raise CasImportError(
                "EMPTY_CAS",
                "CAS contains no valid holdings. Existing portfolio was not changed.",
            )

        logger.info(
            "CAS parsed: user=%s holdings=%d transactions=%d",
            user_id,
            len(normalized.holdings),
            len(normalized.transactions),
        )

        # Create or reuse import record.
        record = existing

        if record is None:
            record = ImportRecord(
                portfolio_id=portfolio.id,
                user_id=user_id,
                source_type=SourceType.CAS,
                file_name=file_name,
                document_hash=document_hash,
                status=ImportStatus.PROCESSING,
            )
            db.add(record)
        else:
            record.portfolio_id = portfolio.id
            record.file_name = file_name
            record.status = ImportStatus.PROCESSING
            record.error_code = None
            record.error_message = None
            record.completed_at = None

        db.flush()

        # IMPORTANT: replace only after parsing succeeded.
        # Both deletes and inserts are committed in one transaction.
        db.execute(
            delete(Transaction).where(
                Transaction.portfolio_id == portfolio.id
            )
        )

        db.execute(
            delete(Holding).where(
                Holding.portfolio_id == portfolio.id
            )
        )

        db.flush()

        holding_by_key: dict[str, Holding] = {}
        total = Decimal("0")

        # Insert the new holdings snapshot.
        for item in normalized.holdings:
            units = item.units or Decimal("0")
            current_value = item.current_value or Decimal("0")
            current_price = item.current_price or Decimal("0")
            average_cost = item.average_cost or Decimal("0")

            holding = Holding(
                portfolio_id=portfolio.id,
                asset_type=item.asset_type,
                name=item.name,
                isin=item.isin,
                quantity=units,
                average_price=average_cost,
                current_price=current_price,
                invested_value=average_cost * units,
                current_value=current_value,
            )

            db.add(holding)
            db.flush()

            key = (
                item.isin
                or normalize_security_name(item.name)
            )
            holding_by_key[key] = holding
            total += current_value

        # Insert transactions using the project's existing model fields.
        for item in normalized.transactions:
            key = (
                item.isin
                or normalize_security_name(item.security_name)
            )

            holding = holding_by_key.get(key)
            units = item.units or Decimal("0")
            amount = item.amount or Decimal("0")
            price = amount / units if units else Decimal("0")

            db.add(
                Transaction(
                    portfolio_id=portfolio.id,
                    holding_id=holding.id if holding else None,
                    transaction_type=item.transaction_type,
                    transaction_date=item.date,
                    quantity=units,
                    price=price,
                    amount=amount,
                )
            )

        # Update portfolio and import record.
        portfolio.total_value = total
        record.statement_period = normalized.statement_period
        record.status = ImportStatus.COMPLETED
        record.completed_at = now
        record.error_code = None
        record.error_message = None

        db.commit()
        db.refresh(portfolio)
        db.refresh(record)

        return _completed_response(db, record, portfolio)

    except (
        CasPdfError,
        UnsupportedCASError,
        CasParseError,
        CasNormalizationError,
        CasImportError,
    ) as error:
        db.rollback()
        logger.exception("CAS import failed: %s", error)

        raise CasImportError(
            getattr(error, "code", "CAS_IMPORT_FAILED"),
            str(error),
        ) from error

    except Exception as error:
        db.rollback()
        logger.exception("Unexpected CAS import error: %s", error)

        raise CasImportError(
            "IMPORT_FAILED",
            "We could not import this CAS statement. Check the backend logs for details.",
        ) from error
