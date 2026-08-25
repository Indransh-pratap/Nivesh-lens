from decimal import Decimal

from app.services.diagnostics.exposure import CompanyExposure

HHI_LOW_MAX = Decimal("0.15")
HHI_MODERATE_MAX = Decimal("0.25")


def calculate_hhi(exposures: list[CompanyExposure], total_value: Decimal) -> tuple[Decimal | None, str]:
    if total_value <= 0 or not exposures:
        return None, "NOT_AVAILABLE"
    hhi = sum(((item.exposure_value / total_value) ** 2 for item in exposures), Decimal("0"))
    if hhi <= HHI_LOW_MAX:
        label = "LOW"
    elif hhi <= HHI_MODERATE_MAX:
        label = "MODERATE"
    else:
        label = "HIGH_CONCENTRATION"
    return hhi, label
