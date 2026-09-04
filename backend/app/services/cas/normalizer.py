import logging
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from app.models.holding import AssetType
from app.models.transaction import TransactionType
from app.services.cas.models import (
    CanonicalHolding,
    CanonicalTransaction,
    NormalizedPortfolio,
    RawCASData,
)

logger = logging.getLogger(__name__)


class CasNormalizationError(Exception):
    code = "CAS_PARSE_FAILED"


# ============================================================
# SECURITY NAME
# ============================================================

def normalize_security_name(name: str) -> str:
    return re.sub(
        r"[^a-z0-9]+",
        " ",
        str(name).lower(),
    ).strip()


# ============================================================
# DECIMAL
# ============================================================

def _decimal(
    value,
    field: str,
) -> Decimal:
    if value is None:
        return Decimal("0")

    if isinstance(value, Decimal):
        return value

    try:
        cleaned = str(value).strip()

        if not cleaned:
            return Decimal("0")

        cleaned = (
            cleaned
            .replace(",", "")
            .replace("₹", "")
            .replace("Rs.", "")
            .replace("Rs", "")
            .strip()
        )

        return Decimal(cleaned)

    except (
        InvalidOperation,
        ValueError,
        AttributeError,
    ) as error:
        raise CasNormalizationError(
            f"Invalid {field}"
        ) from error


# ============================================================
# DATE
# ============================================================

def _parse_transaction_date(
    value,
) -> date | None:

    if value is None:
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    text = str(value).strip()

    if not text:
        return None

    formats = (
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%d/%m/%y",
        "%d-%m-%y",
        "%d/%b/%Y",
        "%d-%b-%Y",
        "%d/%B/%Y",
        "%d-%B-%Y",
        "%Y-%m-%d",
    )

    for fmt in formats:
        try:
            return datetime.strptime(
                text,
                fmt,
            ).date()
        except ValueError:
            continue

    return None


# ============================================================
# TRANSACTION TYPE
# ============================================================

def _normalize_transaction_type(
    value,
) -> TransactionType | None:

    if value is None:
        return None

    raw = str(value).strip()

    if not raw:
        return None

    normalized = re.sub(
        r"[^A-Za-z0-9]+",
        "_",
        raw.upper(),
    ).strip("_")

    # Direct enum match.
    for member in TransactionType:
        if member.name.upper() == normalized:
            return member

        if str(member.value).upper() == normalized:
            return member

    # Common CAS aliases.
    aliases = {
        "BUY": (
            "BUY",
            "PURCHASE",
            "PURCHASED",
        ),
        "PURCHASE": (
            "PURCHASE",
            "PURCHASED",
            "BUY",
        ),
        "PURCHASED": (
            "PURCHASED",
            "PURCHASE",
            "BUY",
        ),
        "SELL": (
            "SELL",
            "SALE",
            "SOLD",
        ),
        "SALE": (
            "SALE",
            "SOLD",
            "SELL",
        ),
        "SOLD": (
            "SOLD",
            "SALE",
            "SELL",
        ),
        "REDEEM": (
            "REDEEM",
            "REDEMPTION",
        ),
        "REDEMPTION": (
            "REDEMPTION",
            "REDEEM",
        ),
        "SWITCH": (
            "SWITCH",
        ),
        "DIVIDEND": (
            "DIVIDEND",
        ),
        "BONUS": (
            "BONUS",
        ),
        "TRANSFER": (
            "TRANSFER",
        ),
    }

    candidates = aliases.get(
        normalized,
        (normalized,),
    )

    for candidate in candidates:

        for member in TransactionType:

            if member.name.upper() == candidate:
                return member

            if str(member.value).upper() == candidate:
                return member

    return None


# ============================================================
# HOLDINGS
# ============================================================

def _normalize_holdings(
    raw_data: RawCASData,
) -> list[CanonicalHolding]:

    holdings: list[CanonicalHolding] = []

    for index, item in enumerate(
        raw_data.holdings,
        start=1,
    ):

        try:
            name = " ".join(
                str(item.name).split()
            ).strip()

            if not name:
                logger.warning(
                    "Skipping holding %d: empty name",
                    index,
                )
                continue

            isin = (
                str(item.isin)
                .strip()
                .upper()
                if item.isin
                else None
            )

            units = _decimal(
                item.units,
                "units",
            )

            average_cost = _decimal(
                item.average_cost,
                "average cost",
            )

            current_value = _decimal(
                item.current_value,
                "current value",
            )

            current_price = _decimal(
                item.current_price,
                "current price",
            )

            holdings.append(
                CanonicalHolding(
                    asset_type=item.asset_type,
                    name=name,
                    isin=isin,
                    units=units,
                    average_cost=average_cost,
                    current_value=current_value,
                    current_price=current_price,
                )
            )

        except CasNormalizationError:
            raise

        except Exception as error:
            raise CasNormalizationError(
                f"Invalid holding at row {index}"
            ) from error

    return holdings


# ============================================================
# TRANSACTIONS
# ============================================================

def _normalize_transactions(
    raw_data: RawCASData,
) -> list[CanonicalTransaction]:

    transactions: list[
        CanonicalTransaction
    ] = []

    for index, item in enumerate(
        raw_data.transactions,
        start=1,
    ):

        try:
            transaction_date = _parse_transaction_date(
                getattr(
                    item,
                    "transaction_date",
                    None,
                )
            )

            transaction_type = (
                _normalize_transaction_type(
                    getattr(
                        item,
                        "transaction_type",
                        None,
                    )
                )
            )

            security_name = str(
                getattr(
                    item,
                    "security_name",
                    "",
                )
                or ""
            ).strip()

            isin_value = getattr(
                item,
                "isin",
                None,
            )

            isin = (
                str(isin_value)
                .strip()
                .upper()
                if isin_value
                else None
            )

            # ------------------------------------------------
            # Invalid transaction rows are SKIPPED.
            # They do not invalidate the whole CAS.
            # ------------------------------------------------

            if not transaction_date:
                logger.warning(
                    "Skipping transaction %d: invalid date=%r",
                    index,
                    getattr(
                        item,
                        "transaction_date",
                        None,
                    ),
                )
                continue

            if transaction_type is None:
                logger.warning(
                    "Skipping transaction %d: unsupported type=%r",
                    index,
                    getattr(
                        item,
                        "transaction_type",
                        None,
                    ),
                )
                continue

            if not security_name and not isin:
                logger.warning(
                    "Skipping transaction %d: missing security name and ISIN",
                    index,
                )
                continue

            units = _decimal(
                getattr(
                    item,
                    "units",
                    None,
                ),
                "transaction units",
            )

            amount = _decimal(
                getattr(
                    item,
                    "amount",
                    None,
                ),
                "transaction amount",
            )

            transactions.append(
                CanonicalTransaction(
                    AssetType.MUTUAL_FUND,
                    security_name,
                    isin,
                    transaction_type,
                    transaction_date,
                    units,
                    amount,
                )
            )

        except CasNormalizationError:
            logger.warning(
                "Skipping malformed transaction %d",
                index,
                exc_info=True,
            )
            continue

        except Exception:
            logger.warning(
                "Skipping malformed transaction %d",
                index,
                exc_info=True,
            )
            continue

    return transactions


# ============================================================
# MAIN NORMALIZER
# ============================================================

def normalize_cas(
    raw_data: RawCASData,
) -> NormalizedPortfolio:

    if raw_data is None:
        raise CasNormalizationError(
            "CAS data is empty"
        )

    # --------------------------------------------------------
    # Normalize holdings
    # --------------------------------------------------------

    holdings = _normalize_holdings(
        raw_data
    )

    if not holdings:
        raise CasNormalizationError(
            "CAS contains no holdings"
        )

    # --------------------------------------------------------
    # Normalize transactions
    # --------------------------------------------------------

    transactions = _normalize_transactions(
        raw_data
    )

    logger.info(
        "CAS normalization complete: holdings=%d transactions=%d",
        len(holdings),
        len(transactions),
    )

    return NormalizedPortfolio(
        holdings=holdings,
        transactions=transactions,
        statement_period=raw_data.statement_period,
    )