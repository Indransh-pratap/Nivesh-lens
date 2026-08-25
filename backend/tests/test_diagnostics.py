from decimal import Decimal

from app.models.holding import AssetType, Holding
from app.services.diagnostics.concentration import calculate_hhi
from app.services.diagnostics.exposure import calculate_effective_company_exposure
from app.services.diagnostics.service import build_diagnostics


def holding(name: str, isin: str, value: str) -> Holding:
    return Holding(asset_type=AssetType.STOCK, name=name, isin=isin, current_value=Decimal(value))


def test_company_exposure_and_hhi():
    exposures, unavailable = calculate_effective_company_exposure([holding("Company A", "INE000000001", "200"), holding("Company B", "INE000000002", "800")], Decimal("1000"))
    hhi, classification = calculate_hhi(exposures, Decimal("1000"))
    assert not unavailable
    assert exposures[0].exposure_percent == Decimal("80.0")
    assert hhi == Decimal("0.68")
    assert classification == "HIGH_CONCENTRATION"


def test_zero_value_portfolio_is_not_scored():
    result = build_diagnostics("portfolio", [], Decimal("0"))
    assert result["concentration"]["hhi"] is None
    assert result["diversification_score"]["score"] is None


def test_mutual_fund_lookthrough_is_explicitly_unavailable():
    fund = Holding(asset_type=AssetType.MUTUAL_FUND, name="Fund", current_value=Decimal("100"))
    result = build_diagnostics("portfolio", [fund], Decimal("100"))
    assert any(item["code"] == "MF_LOOKTHROUGH_UNAVAILABLE" for item in result["alerts"])
