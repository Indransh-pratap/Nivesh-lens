from decimal import Decimal
import uuid
import pytest

from app.models.holding import AssetType, Holding
from app.services.exposure.company_exposure import (
    calculate_company_exposure,
    FundUnderlyingHolding,
    MutualFundHoldingsProvider,
)


class MockReconciliationProvider(MutualFundHoldingsProvider):
    def __init__(self, data: dict[str, tuple[list[FundUnderlyingHolding], str]]):
        self.data = data

    def get_fund_holdings(self, fund_isin: str | None, fund_name: str):
        key = (fund_isin.strip().upper() if fund_isin else "") or fund_name.strip().lower()
        res = self.data.get(key)
        if res:
            return res[0], res[1]
        return [], None


def make_holding(name: str, isin: str | None, asset_type: AssetType, current_val: str) -> Holding:
    return Holding(
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


def test_fund_cash_debt_residual_reconciliation():
    # Investor owns ₹1,00,000 of Fund A.
    # Fund A owns:
    # - Reliance: 60% (₹60,000)
    # - HDFC Bank: 30% (₹30,000)
    # Underlying equity sum: 90%. Residual cash/debt in fund: 10% (₹10,000).
    # Plus investor has direct Cash of ₹50,000.
    # Total portfolio value: ₹1,50,000.
    mf_holding = make_holding("Fund Alpha", "INF001A01001", AssetType.MUTUAL_FUND, "100000")
    cash_holding = make_holding("Bank Cash Balance", None, AssetType.CASH, "50000")

    provider = MockReconciliationProvider({
        "INF001A01001": (
            [
                FundUnderlyingHolding("Reliance Industries", "INE002A01018", "Energy", Decimal("60.0"), None),
                FundUnderlyingHolding("HDFC Bank", "INE040A01034", "Financials", Decimal("30.0"), None),
            ],
            None,
        )
    })

    result = calculate_company_exposure(
        portfolio_id="test-recon-1",
        holdings=[mf_holding, cash_holding],
        provider=provider,
    )

    assert result.portfolio_value == 150000.0
    assert len(result.companies) == 2

    # Reliance exposure: ₹60,000 (40.0% of ₹1.5L)
    rel = next(c for c in result.companies if c.isin == "INE002A01018")
    assert rel.mutual_fund_value == 60000.0
    assert rel.combined_percent == 40.0

    # HDFC Bank exposure: ₹30,000 (20.0% of ₹1.5L)
    hdfc = next(c for c in result.companies if c.isin == "INE040A01034")
    assert hdfc.mutual_fund_value == 30000.0
    assert hdfc.combined_percent == 20.0

    # Cash and debt reconciliation: ₹50,000 (direct cash) + ₹10,000 (fund cash/debt) = ₹60,000 (40%)
    assert result.cash_debt_value == 60000.0
    assert result.cash_debt_percent == 40.0

    # Total reconciled should exactly equal portfolio value: ₹60K (Rel) + ₹30K (HDFC) + ₹60K (Cash) = ₹150K
    assert result.reconciled_total_value == 150000.0
    assert result.reconciliation_difference == 0.0


def test_unmapped_scheme_exposure_remains_visible():
    # Fund with no look-through available must NOT disappear from portfolio reconciliation
    fund_known = make_holding("Fund Known", "INF001", AssetType.MUTUAL_FUND, "100000")
    fund_unknown = make_holding("Fund Unknown", "INF999", AssetType.MUTUAL_FUND, "100000")

    provider = MockReconciliationProvider({
        "INF001": (
            [
                FundUnderlyingHolding("TCS", "INE467B01029", "IT", Decimal("100.0"), None),
            ],
            None,
        )
        # INF999 has no disclosures
    })

    result = calculate_company_exposure(
        portfolio_id="test-recon-2",
        holdings=[fund_known, fund_unknown],
        provider=provider,
    )

    assert result.portfolio_value == 200000.0
    # Mapped company TCS: ₹1,00,000 (50%)
    assert len(result.companies) == 1
    assert result.companies[0].combined_value == 100000.0

    # Unmapped value must be explicitly recorded: ₹1,00,000 (50%)
    assert result.unmapped_value == 100000.0
    assert result.unmapped_percent == 50.0

    # Full portfolio is accounted for
    assert result.reconciled_total_value == 200000.0
    assert result.reconciliation_difference == 0.0
