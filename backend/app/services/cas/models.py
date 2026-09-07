from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from app.models.holding import AssetType
from app.models.transaction import TransactionType


@dataclass(frozen=True)
class RawHolding:
    name: str
    isin: str | None
    units: str
    average_cost: str | None
    current_value: str | None
    current_price: str | None = None

    # CAS metadata
    asset_type: AssetType = AssetType.MUTUAL_FUND
    folio_number: str | None = None
    amc: str | None = None
    advisor: str | None = None
    nominee_status: str = "UNKNOWN"
    nominee_name: str | None = None


@dataclass(frozen=True)
class RawTransaction:
    security_name: str
    isin: str | None
    transaction_type: str
    transaction_date: str
    units: str
    amount: str

    # CAS metadata
    folio_number: str | None = None
    asset_type: AssetType = AssetType.MUTUAL_FUND
    nav: str | None = None
    unit_balance: str | None = None


@dataclass(frozen=True)
class RawCASData:
    format_name: str
    holdings: list[RawHolding] = field(default_factory=list)
    transactions: list[RawTransaction] = field(default_factory=list)
    statement_period: date | None = None


@dataclass(frozen=True)
class CanonicalHolding:
    asset_type: AssetType
    name: str
    isin: str | None
    units: Decimal
    average_cost: Decimal
    current_value: Decimal
    current_price: Decimal
    folio_number: str | None = None
    amc: str | None = None
    advisor: str | None = None
    nominee_status: str = "UNKNOWN"
    nominee_name: str | None = None


@dataclass(frozen=True)
class CanonicalTransaction:
    asset_type: AssetType
    security_name: str
    isin: str | None
    transaction_type: TransactionType
    date: date
    units: Decimal
    amount: Decimal


@dataclass(frozen=True)
class NormalizedPortfolio:
    holdings: list[CanonicalHolding]
    transactions: list[CanonicalTransaction]
    statement_period: date | None