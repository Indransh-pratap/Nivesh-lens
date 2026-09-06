from decimal import Decimal
import uuid
import pytest

from app.core.security import get_current_user_id
from app.main import app
from app.models.holding import AssetType, Holding
from app.models.portfolio import Portfolio
from app.services.exposure.company_exposure import (
    calculate_company_exposure,
    FundUnderlyingHolding,
    MutualFundHoldingsProvider,
)


class MockProvider(MutualFundHoldingsProvider):
    def __init__(self, data: dict[str, tuple[list[FundUnderlyingHolding], str]]):
        self.data = data

    def get_fund_holdings(self, fund_isin: str | None, fund_name: str):
        key = (fund_isin.strip().upper() if fund_isin else "") or fund_name.strip().lower()
        res = self.data.get(key)
        if res:
            return res[0], res[1]
        return [], None


def make_holding(name: str, isin: str | None, asset_type: AssetType, current_val: str) -> Holding:
    h = Holding(
        id=uuid.uuid4(),
        portfolio_id=uuid.uuid4(),
        name=name,
        isin=isin,
        asset_type=asset_type,
        current_value=Decimal(current_val),
        invested_value=Decimal(current_val),
        quantity=Decimal("1"),
        average_price=Decimal(current_val),
        current_price=Decimal(current_val),
    )
    return h


# TEST 1: Direct stock only
def test_direct_stock_only():
    # Portfolio: 1,00,000; Direct Reliance: 20,000 -> 20%
    h1 = make_holding("Reliance Industries Ltd", "INE002A01018", AssetType.STOCK, "20000")
    h2 = make_holding("Cash Balance", None, AssetType.CASH, "80000")

    result = calculate_company_exposure(
        portfolio_id="test-p1",
        holdings=[h1, h2],
        provider=MockProvider({}),
    )

    assert result.portfolio_value == 100000.0
    assert len(result.companies) == 1
    rel = result.companies[0]
    assert rel.isin == "INE002A01018"
    assert rel.combined_value == 20000.0
    assert rel.direct_value == 20000.0
    assert rel.mutual_fund_value == 0.0
    assert rel.combined_percent == 20.0
    assert len(rel.sources) == 1
    assert rel.sources[0].type == "direct"
    assert rel.sources[0].value == 20000.0


# TEST 2: MF only
def test_mf_only():
    # MF value: 1,00,000, Reliance weight: 10% -> 10,000
    mf_holding = make_holding("Fund Alpha - Growth", "INF001A01001", AssetType.MUTUAL_FUND, "100000")
    provider = MockProvider({
        "INF001A01001": (
            [
                FundUnderlyingHolding(
                    company_name="Reliance Industries",
                    company_isin="INE002A01018",
                    sector="Energy",
                    weight_percentage=Decimal("10.0"),
                    as_of_date=None,
                )
            ],
            None,
        )
    })

    result = calculate_company_exposure(
        portfolio_id="test-p2",
        holdings=[mf_holding],
        provider=provider,
    )

    assert result.portfolio_value == 100000.0
    assert len(result.companies) == 1
    rel = result.companies[0]
    assert rel.combined_value == 10000.0
    assert rel.direct_value == 0.0
    assert rel.mutual_fund_value == 10000.0
    assert rel.combined_percent == 10.0
    assert len(rel.sources) == 1
    assert rel.sources[0].type == "mutual_fund"
    assert rel.sources[0].fund_name == "Fund Alpha - Growth"
    assert rel.sources[0].company_weight == 10.0
    assert rel.sources[0].exposure_value == 10000.0


# TEST 3: Direct + MF
def test_direct_plus_mf():
    # Direct: 20,000, MF: 1,00,000 with Reliance 10% (10,000) -> Expected: 30,000
    direct = make_holding("Reliance Industries", "INE002A01018", AssetType.STOCK, "20000")
    mf = make_holding("Parag Parikh Flexi Cap", "INF879O01015", AssetType.MUTUAL_FUND, "100000")
    provider = MockProvider({
        "INF879O01015": (
            [
                FundUnderlyingHolding(
                    company_name="Reliance Industries Ltd",
                    company_isin="INE002A01018",
                    sector="Oil & Gas",
                    weight_percentage=Decimal("10.0"),
                    as_of_date=None,
                )
            ],
            None,
        )
    })

    result = calculate_company_exposure(
        portfolio_id="test-p3",
        holdings=[direct, mf],
        provider=provider,
    )

    assert result.portfolio_value == 120000.0
    assert len(result.companies) == 1
    rel = result.companies[0]
    assert rel.combined_value == 30000.0
    assert rel.direct_value == 20000.0
    assert rel.mutual_fund_value == 10000.0
    assert rel.combined_percent == 25.0
    assert len(rel.sources) == 2


# TEST 4: Multiple mutual funds
def test_multiple_mutual_funds():
    # MF A: 1,00,000 * 10% = 10,000
    # MF B: 50,000 * 8% = 4,000
    # Direct: 20,000
    # Total combined: 34,000
    direct = make_holding("Reliance Industries", "INE002A01018", AssetType.STOCK, "20000")
    mf_a = make_holding("Fund A", "INF001", AssetType.MUTUAL_FUND, "100000")
    mf_b = make_holding("Fund B", "INF002", AssetType.MUTUAL_FUND, "50000")

    provider = MockProvider({
        "INF001": (
            [
                FundUnderlyingHolding(
                    company_name="Reliance Industries",
                    company_isin="INE002A01018",
                    sector="Energy",
                    weight_percentage=Decimal("10.0"),
                    as_of_date=None,
                )
            ],
            None,
        ),
        "INF002": (
            [
                FundUnderlyingHolding(
                    company_name="Reliance Industries",
                    company_isin="INE002A01018",
                    sector="Energy",
                    weight_percentage=Decimal("8.0"),
                    as_of_date=None,
                )
            ],
            None,
        ),
    })

    result = calculate_company_exposure(
        portfolio_id="test-p4",
        holdings=[direct, mf_a, mf_b],
        provider=provider,
    )

    assert result.portfolio_value == 170000.0
    rel = next(c for c in result.companies if c.isin == "INE002A01018")
    assert rel.combined_value == 34000.0
    assert rel.direct_value == 20000.0
    assert rel.mutual_fund_value == 14000.0
    assert rel.combined_percent == 20.0
    assert len(rel.sources) == 3


# TEST 5: Duplicate company names with same ISIN
def test_duplicate_company_names_same_isin():
    # Direct: "Reliance Industries Ltd", ISIN: INE002A01018
    # MF: "Reliance Industries Limited", ISIN: INE002A01018
    # Must merge into ONE canonical company
    direct = make_holding("Reliance Industries Ltd", "INE002A01018", AssetType.STOCK, "10000")
    mf = make_holding("Fund X", "INFX", AssetType.MUTUAL_FUND, "100000")

    provider = MockProvider({
        "INFX": (
            [
                FundUnderlyingHolding(
                    company_name="Reliance Industries Limited",
                    company_isin="INE002A01018",
                    sector="Conglomerate",
                    weight_percentage=Decimal("5.0"),
                    as_of_date=None,
                )
            ],
            None,
        )
    })

    result = calculate_company_exposure(
        portfolio_id="test-p5",
        holdings=[direct, mf],
        provider=provider,
    )

    assert len(result.companies) == 1
    assert result.companies[0].isin == "INE002A01018"
    assert result.companies[0].combined_value == 15000.0


# TEST 6: Multiple direct positions
def test_multiple_direct_positions():
    # 10,000 + 5,000 -> 15,000 direct exposure
    pos_nse = make_holding("Reliance Industries Ltd - NSE", "INE002A01018", AssetType.STOCK, "10000")
    pos_bse = make_holding("Reliance Industries Ltd - BSE", "INE002A01018", AssetType.STOCK, "5000")

    result = calculate_company_exposure(
        portfolio_id="test-p6",
        holdings=[pos_nse, pos_bse],
        provider=MockProvider({}),
    )

    assert len(result.companies) == 1
    assert result.companies[0].direct_value == 15000.0
    assert result.companies[0].combined_value == 15000.0
    assert len(result.companies[0].sources) == 2


# TEST 7: Zero portfolio value
def test_zero_portfolio_value():
    h = make_holding("Empty stock", "INEX", AssetType.STOCK, "0")
    result = calculate_company_exposure(
        portfolio_id="test-p7",
        holdings=[h],
        provider=MockProvider({}),
    )
    assert result.portfolio_value == 0.0
    assert result.companies == []


# TEST 8: Missing MF composition
def test_missing_mf_composition():
    # Must not fabricate exposure
    mf = make_holding("Unknown Mutual Fund", "INF_UNKNOWN", AssetType.MUTUAL_FUND, "50000")
    result = calculate_company_exposure(
        portfolio_id="test-p8",
        holdings=[mf],
        provider=MockProvider({}),
    )
    assert result.portfolio_value == 50000.0
    assert result.companies == []
    assert result.mf_lookthrough_available is False


# TEST 10: Decimal precision
def test_decimal_precision():
    # Test fractional weights and floating point precision safety
    direct = make_holding("Infosys Ltd", "INE009A01021", AssetType.STOCK, "12345.67")
    mf = make_holding("Index Fund", "INF_INDEX", AssetType.MUTUAL_FUND, "98765.43")

    provider = MockProvider({
        "INF_INDEX": (
            [
                FundUnderlyingHolding(
                    company_name="Infosys Ltd",
                    company_isin="INE009A01021",
                    sector="IT",
                    weight_percentage=Decimal("7.3333"),
                    as_of_date=None,
                )
            ],
            None,
        )
    })

    result = calculate_company_exposure(
        portfolio_id="test-p10",
        holdings=[direct, mf],
        provider=provider,
    )

    # 12345.67 + (98765.43 * 0.073333) = 12345.67 + 7242.7687... = 19588.44
    infy = result.companies[0]
    expected_direct = 12345.67
    expected_mf = float((Decimal("98765.43") * Decimal("7.3333") / Decimal("100")).quantize(Decimal("0.01")))
    expected_combined = float((Decimal("12345.67") + Decimal(str(expected_mf))).quantize(Decimal("0.01")))

    assert infy.direct_value == expected_direct
    assert abs(infy.mutual_fund_value - expected_mf) <= 0.01
    assert abs(infy.combined_value - expected_combined) <= 0.01


# TEST 9: Integration test & Unauthorized portfolio
def test_api_company_exposure_endpoint(client):
    # 1. Create portfolio
    res = client.post("/api/portfolios", json={"name": "Company Exposure Portfolio"})
    assert res.status_code == 201
    p_id = res.json()["id"]

    # 2. Call endpoint
    res = client.get(f"/api/portfolios/{p_id}/company-exposure")
    assert res.status_code == 200
    data = res.json()
    assert "portfolio_id" in data
    assert "portfolio_value" in data
    assert "companies" in data
    assert "mf_lookthrough_available" in data
    assert "total_direct_value" in data
    assert "total_mf_value" in data

    # 3. TEST 9: Unauthorized access blocked (different user receives 404)
    async def another_user() -> str:
        return "unauthorized-user"

    app.dependency_overrides[get_current_user_id] = another_user
    res = client.get(f"/api/portfolios/{p_id}/company-exposure")
    assert res.status_code == 404
