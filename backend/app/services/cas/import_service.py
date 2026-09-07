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
    def __init__(
        self,
        code: str,
        message: str,
    ):
        self.code = code
        self.message = message
        super().__init__(message)


# ============================================================
# PDF UPLOAD
# ============================================================

async def save_temp_pdf(
    upload: UploadFile,
) -> tuple[str, str]:

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
        with os.fdopen(
            fd,
            "wb",
        ) as target:

            while True:
                chunk = await upload.read(
                    1024 * 1024
                )

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

        with open(
            path,
            "rb",
        ) as source:
            pdf_signature = source.read(5)

        if (
            size < 5
            or not pdf_signature.startswith(
                b"%PDF-"
            )
        ):
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

def _portfolio(
    db: Session,
    user_id: str,
) -> Portfolio:

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

def _decimal_float(
    value,
) -> float:
    if value is None:
        return 0.0

    try:
        return float(value)
    except (
        TypeError,
        ValueError,
    ):
        return 0.0


def _serialize_holding(
    holding: Holding,
) -> dict:

    asset_type = getattr(
        holding,
        "asset_type",
        None,
    )

    if hasattr(
        asset_type,
        "value",
    ):
        asset_type = asset_type.value
    elif asset_type is not None:
        asset_type = str(
            asset_type
        )

    quantity = getattr(
        holding,
        "quantity",
        None,
    )

    average_price = getattr(
        holding,
        "average_price",
        None,
    )

    current_price = getattr(
        holding,
        "current_price",
        None,
    )

    invested_value = getattr(
        holding,
        "invested_value",
        None,
    )

    current_value = getattr(
        holding,
        "current_value",
        None,
    )

    return {
        "id": str(
            holding.id
        ),

        "name": holding.name,

        "isin": holding.isin,

        "ticker": (
            holding.isin[:6]
            if holding.isin
            else None
        ),

        "units": _decimal_float(
            quantity
        ),

        "quantity": _decimal_float(
            quantity
        ),

        "averageCost": _decimal_float(
            average_price
        ),

        "average_cost": _decimal_float(
            average_price
        ),

        "currentPrice": _decimal_float(
            current_price
        ),

        "current_price": _decimal_float(
            current_price
        ),

        "investedValue": _decimal_float(
            invested_value
        ),

        "invested_value": _decimal_float(
            invested_value
        ),

        "currentValue": _decimal_float(
            current_value
        ),

        "current_value": _decimal_float(
            current_value
        ),

        "assetType": asset_type,

        "asset_type": asset_type,

        "returns": _decimal_float(
            ((current_value - invested_value) / invested_value * Decimal("100"))
            if invested_value and invested_value > Decimal("0") and current_value is not None
            else Decimal("0")
        ),

        "returnsValue": _decimal_float(
            (current_value - invested_value)
            if current_value is not None and invested_value is not None
            else Decimal("0")
        ),

        "returns_value": _decimal_float(
            (current_value - invested_value)
            if current_value is not None and invested_value is not None
            else Decimal("0")
        ),

        "planType": (
            "Regular"
            if "REGULAR" in holding.name.upper()
            else "Direct"
        ),

        "expenseRatio": 0.0,

        "expense_ratio": 0.0,

        "riskGrade": "Low",

        "risk_grade": "Low",
    }


def _portfolio_holdings(
    db: Session,
    portfolio_id,
) -> list[dict]:

    holdings = db.scalars(
        select(Holding)
        .where(
            Holding.portfolio_id
            == portfolio_id
        )
        .order_by(
            Holding.name
        )
    ).all()

    return [
        _serialize_holding(
            holding
        )
        for holding in holdings
    ]


def _completed_response(
    db: Session,
    record: ImportRecord,
    portfolio: Portfolio,
) -> dict:

    holdings = _portfolio_holdings(
        db,
        portfolio.id,
    )

    transactions_count = len(
        db.scalars(
            select(Transaction).where(
                Transaction.portfolio_id
                == portfolio.id
            )
        ).all()
    )

    return {
        "success": True,
        "status": "completed",
        "import_id": str(
            record.id
        ),
        "portfolio_id": str(
            portfolio.id
        ),
        "holdings_count": len(
            holdings
        ),
        "transactions_count": transactions_count,
        "holdings": holdings,
        "total_value": _decimal_float(
            portfolio.total_value
        ),
    }


# ============================================================
# MAIN IMPORT
# ============================================================

def import_cas(
    db: Session,
    user_id: str,
    file_name: str | None,
    document_hash: str,
    text: str,
) -> dict:

    now = datetime.now(
        timezone.utc
    )

    file_name = (
        file_name or "cas.pdf"
    )[:255]

    # ========================================================
    # FIND EXISTING IMPORT
    # ========================================================

    existing = db.scalar(
        select(ImportRecord).where(
            ImportRecord.user_id
            == user_id,
            ImportRecord.source_type
            == SourceType.CAS,
            ImportRecord.document_hash
            == document_hash,
        )
    )

    # ========================================================
    # EXISTING COMPLETED
    # ========================================================

    if (
        existing
        and existing.status
        == ImportStatus.COMPLETED
    ):

        portfolio = db.get(
            Portfolio,
            existing.portfolio_id,
        )

        if portfolio is None:
            # Database is inconsistent. Re-import instead.
            existing = None

        else:
            resp = _completed_response(
                db,
                existing,
                portfolio,
            )
            resp["status"] = "already_imported"
            return resp

    # ========================================================
    # PORTFOLIO
    # ========================================================

    portfolio = _portfolio(
        db,
        user_id,
    )

    # ========================================================
    # EXISTING FAILED / PROCESSING / PENDING
    #
    # Reuse the existing row instead of deleting/reinserting.
    # This avoids the unique constraint issue.
    # ========================================================

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
        record.status = (
            ImportStatus.PROCESSING
        )
        record.error_code = None
        record.error_message = None
        record.completed_at = None

    try:
        db.flush()

    except IntegrityError:
        db.rollback()

        # Another request may have created the same import.
        latest = db.scalar(
            select(ImportRecord).where(
                ImportRecord.user_id
                == user_id,
                ImportRecord.source_type
                == SourceType.CAS,
                ImportRecord.document_hash
                == document_hash,
            )
        )

        if (
            latest
            and latest.status
            == ImportStatus.COMPLETED
        ):
            latest_portfolio = db.get(
                Portfolio,
                latest.portfolio_id,
            )

            if latest_portfolio:
                return _completed_response(
                    db,
                    latest,
                    latest_portfolio,
                )

        if latest:
            record = latest
        else:
            raise

    # ========================================================
    # PARSE + NORMALIZE
    #
    # Do this before deleting existing portfolio holdings.
    # That way a failed parse won't wipe good data.
    # ========================================================

    try:

        cas_format = detect_cas_format(
            text
        )

        logger.info(
            "CAS import: detected format=%s user=%s file=%s",
            getattr(
                cas_format,
                "value",
                str(cas_format),
            ),
            user_id,
            file_name,
        )

        parsed = parse_cas(
            text,
            cas_format,
        )

        normalized = normalize_cas(
            parsed
        )

        if not normalized.holdings:
            raise CasImportError(
                "EMPTY_CAS",
                "CAS contains no holdings",
            )

        logger.info(
            "CAS import: parsed %d holdings and %d transactions",
            len(
                normalized.holdings
            ),
            len(
                normalized.transactions
            ),
        )

        # ====================================================
        # NOW REPLACE OLD PORTFOLIO HOLDINGS
        # ====================================================

        db.execute(
            delete(Transaction).where(
                Transaction.portfolio_id
                == portfolio.id
            )
        )

        db.execute(
            delete(Holding).where(
                Holding.portfolio_id
                == portfolio.id
            )
        )

        db.flush()

        # ====================================================
        # CREATE HOLDINGS
        # ====================================================

        holding_by_key: dict[
            str,
            Holding,
        ] = {}

        total = Decimal("0")

        for item in normalized.holdings:

            units = (
                item.units
                or Decimal("0")
            )

            current_value = (
                item.current_value
                or Decimal("0")
            )

            current_price = (
                item.current_price
                or Decimal("0")
            )

            average_cost = (
                item.average_cost
                or Decimal("0")
            )

            # IMPORTANT:
            # CDSL may not provide average cost.
            #
            # Never do:
            # average_cost * units
            #
            # when average_cost is None.
            invested_value = (
                average_cost * units
            )

            holding = Holding(
                portfolio_id=portfolio.id,

                asset_type=item.asset_type,

                name=item.name,

                isin=item.isin,

                quantity=units,

                average_price=average_cost,

                current_price=current_price,

                invested_value=invested_value,

                current_value=current_value,
            )

            db.add(
                holding
            )

            db.flush()

            key = (
                item.isin
                or normalize_security_name(
                    item.name
                )
            )

            holding_by_key[
                key
            ] = holding

            total += current_value

        # ====================================================
        # CREATE TRANSACTIONS
        # ====================================================

        for item in normalized.transactions:

            key = (
                item.isin
                or normalize_security_name(
                    item.security_name
                )
            )

            holding = holding_by_key.get(
                key
            )

            units = (
                item.units
                or Decimal("0")
            )

            amount = (
                item.amount
                or Decimal("0")
            )

            if units:
                price = (
                    amount / units
                )
            else:
                price = Decimal("0")

            transaction = Transaction(
                portfolio_id=portfolio.id,

                holding_id=(
                    holding.id
                    if holding
                    else None
                ),

                transaction_type=(
                    item.transaction_type
                ),

                transaction_date=(
                    item.date
                ),

                quantity=units,

                price=price,

                amount=amount,
            )

            db.add(
                transaction
            )

        # ====================================================
        # UPDATE PORTFOLIO
        # ====================================================

        portfolio.total_value = total

        record.statement_period = (
            normalized.statement_period
        )

        record.status = (
            ImportStatus.COMPLETED
        )

        record.completed_at = now

        record.error_code = None

        record.error_message = None

        db.commit()

        # ====================================================
        # REFRESH FROM DATABASE
        # ========================================================

        db.refresh(
            portfolio
        )

        db.refresh(
            record
        )

        holdings = _portfolio_holdings(
            db,
            portfolio.id,
        )

        transactions_count = len(
            normalized.transactions
        )

        logger.info(
            "CAS import completed: %d holdings, total=%s, import_id=%s",
            len(holdings),
            total,
            record.id,
        )

        return {
            "success": True,
            "status": "completed",
            "import_id": str(
                record.id
            ),
            "portfolio_id": str(
                portfolio.id
            ),
            "holdings_count": len(
                holdings
            ),
            "transactions_count": transactions_count,
            "holdings": holdings,
            "total_value": _decimal_float(
                total
            ),
        }

    # ========================================================
    # EXPECTED CAS ERRORS
    # ========================================================

    except (
        CasPdfError,
        UnsupportedCASError,
        CasParseError,
        CasNormalizationError,
        CasImportError,
    ) as error:

        logger.exception(
            "CAS import failed: %s",
            error,
        )

        db.rollback()

        # Re-fetch portfolio and import record after rollback.
        portfolio = db.scalar(
            select(Portfolio).where(
                Portfolio.user_id
                == user_id,
                Portfolio.name
                == "CAS Portfolio",
            )
        )

        if portfolio is None:
            portfolio = _portfolio(
                db,
                user_id,
            )

        record = db.scalar(
            select(ImportRecord).where(
                ImportRecord.user_id
                == user_id,
                ImportRecord.source_type
                == SourceType.CAS,
                ImportRecord.document_hash
                == document_hash,
            )
        )

        # Reuse the same ImportRecord.
        if record is None:
            record = ImportRecord(
                portfolio_id=portfolio.id,
                user_id=user_id,
                source_type=SourceType.CAS,
                file_name=file_name,
                document_hash=document_hash,
            )

            db.add(record)

        record.portfolio_id = portfolio.id
        record.file_name = file_name
        record.status = (
            ImportStatus.FAILED
        )
        record.error_code = getattr(
            error,
            "code",
            "CAS_PARSE_FAILED",
        )
        record.error_message = str(
            error
        )[:500]
        record.completed_at = now

        db.commit()

        raise CasImportError(
            record.error_code
            or "IMPORT_FAILED",
            str(error),
        ) from error

    # ========================================================
    # UNEXPECTED ERRORS
    # ========================================================

    except Exception as error:

        logger.exception(
            "Unexpected CAS import error",
            exc_info=error,
        )

        db.rollback()

        portfolio = db.scalar(
            select(Portfolio).where(
                Portfolio.user_id
                == user_id,
                Portfolio.name
                == "CAS Portfolio",
            )
        )

        if portfolio is None:
            portfolio = _portfolio(
                db,
                user_id,
            )

        record = db.scalar(
            select(ImportRecord).where(
                ImportRecord.user_id
                == user_id,
                ImportRecord.source_type
                == SourceType.CAS,
                ImportRecord.document_hash
                == document_hash,
            )
        )

        if record is None:
            record = ImportRecord(
                portfolio_id=portfolio.id,
                user_id=user_id,
                source_type=SourceType.CAS,
                file_name=file_name,
                document_hash=document_hash,
            )

            db.add(record)

        record.portfolio_id = portfolio.id
        record.file_name = file_name
        record.status = (
            ImportStatus.FAILED
        )
        record.error_code = (
            "IMPORT_FAILED"
        )
        record.error_message = str(
            error
        )[:500]
        record.completed_at = now

        db.commit()

        raise CasImportError(
            "IMPORT_FAILED",
            "We could not import this CAS statement.",
        ) from error