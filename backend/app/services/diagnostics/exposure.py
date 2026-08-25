from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal

from app.models.holding import AssetType, Holding
from app.services.cas.normalizer import normalize_security_name


@dataclass(frozen=True)
class ExposureSource:
    type: str
    value: Decimal


@dataclass(frozen=True)
class CompanyExposure:
    company: str
    exposure_value: Decimal
    exposure_percent: Decimal
    sources: list[ExposureSource]


def calculate_effective_company_exposure(holdings: list[Holding], total_value: Decimal) -> tuple[list[CompanyExposure], bool]:
    """Counts direct equities only. MF look-through is intentionally unavailable until fund data exists."""
    grouped: dict[str, tuple[str, Decimal]] = {}
    mf_present = False
    for holding in holdings:
        if holding.asset_type == AssetType.MUTUAL_FUND:
            mf_present = True
            continue
        if holding.asset_type != AssetType.STOCK or holding.current_value <= 0:
            continue
        key = holding.isin or normalize_security_name(holding.name)
        display, value = grouped.get(key, (holding.name, Decimal("0")))
        grouped[key] = (display, value + holding.current_value)
    exposures = [CompanyExposure(company=name, exposure_value=value, exposure_percent=(value / total_value * Decimal("100")) if total_value else Decimal("0"), sources=[ExposureSource(type="DIRECT", value=value)]) for name, value in grouped.values()]
    return sorted(exposures, key=lambda item: item.exposure_value, reverse=True), mf_present
