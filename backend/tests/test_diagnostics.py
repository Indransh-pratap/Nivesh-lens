from decimal import Decimal
from datetime import date
from app.models.market_data import FundScheme, SchemeHolding
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
def test_mutual_fund_lookthrough_combines_direct_and_indirect_exposure():
    direct = Holding(
        asset_type=AssetType.STOCK,
        name="Company A",
        isin="INE000000001",
        current_value=Decimal("20000"),
    )

    fund = Holding(
        asset_type=AssetType.MUTUAL_FUND,
        name="Test Fund",
        isin="INF000000001",
        current_value=Decimal("80000"),
    )

    scheme = FundScheme(
        scheme_code="TEST001",
        scheme_name="Test Fund",
        isin="INF000000001",
        amc_name="Test AMC",
    )

    scheme_holding = SchemeHolding(
        scheme=scheme,
        as_of_date=date(2026, 8, 31),
        company_name="Company A",
        company_isin="INE000000001",
        sector="Technology",
        weight_percentage=Decimal("10.00"),
    )

    scheme.holdings = [scheme_holding]

    exposures, unavailable = calculate_effective_company_exposure(
        [direct, fund],
        Decimal("100000"),
        {"INF000000001": scheme},
    )

    assert not unavailable
    assert len(exposures) == 1

    company = exposures[0]

    assert company.company == "Company A"
    assert company.exposure_value == Decimal("28000.00")
    assert company.exposure_percent == Decimal("28.00")

    source_values = {
        source.type: source.value
        for source in company.sources
    }

    assert source_values["DIRECT"] == Decimal("20000")
    assert source_values["MF_LOOKTHROUGH"] == Decimal("8000")