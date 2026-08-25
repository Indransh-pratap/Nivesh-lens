import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

from app.models.holding import AssetType
from app.models.transaction import TransactionType
from app.services.cas.models import CanonicalHolding, CanonicalTransaction, NormalizedPortfolio, RawCASData


class CasNormalizationError(Exception):
    code = "CAS_PARSE_FAILED"


def normalize_security_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()


def _decimal(value: str | None, field: str) -> Decimal:
    try:
        return Decimal((value or "0").replace(",", ""))
    except (InvalidOperation, AttributeError) as error:
        raise CasNormalizationError(f"Invalid {field}") from error


def normalize_cas(raw_data: RawCASData) -> NormalizedPortfolio:
    holdings = [CanonicalHolding(asset_type=AssetType.MUTUAL_FUND, name=" ".join(item.name.split()), isin=item.isin.upper() if item.isin else None, units=_decimal(item.units, "units"), average_cost=_decimal(item.average_cost, "average cost"), current_value=_decimal(item.current_value, "current value"), current_price=_decimal(item.current_price, "current price")) for item in raw_data.holdings]
    transactions: list[CanonicalTransaction] = []
    for item in raw_data.transactions:
        try:
            transaction_date = datetime.strptime(item.transaction_date, "%d/%m/%Y").date()
            kind = TransactionType(item.transaction_type.upper())
        except ValueError as error:
            raise CasNormalizationError("Invalid transaction") from error
        transactions.append(CanonicalTransaction(AssetType.MUTUAL_FUND, item.security_name, item.isin.upper() if item.isin else None, kind, transaction_date, _decimal(item.units, "transaction units"), _decimal(item.amount, "transaction amount")))
    if not holdings:
        raise CasNormalizationError("CAS contains no holdings")
    return NormalizedPortfolio(holdings=holdings, transactions=transactions, statement_period=raw_data.statement_period)
