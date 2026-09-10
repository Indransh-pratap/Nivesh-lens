import math
from decimal import Decimal
import pytest

from app.services.diagnostics.hhi_engine import (
    HHIItem,
    calculate_generic_hhi,
    calculate_portfolio_company_hhi,
)


def test_scenario_1_equally_weighted_portfolio():
    """
    Scenario 1: Equally weighted portfolio.
    - 10 holdings with 10% each:
      HHI = 10 * (10)^2 = 10 * 100 = 1,000.
      Should classify as LOW_CONCENTRATION (< 1500).
    - 100 holdings with 1% each:
      HHI = 100 * (1)^2 = 100.
    """
    weights_10 = [Decimal("10.0")] * 10
    score_10, norm_10, classification_10 = calculate_generic_hhi(weights_10)

    assert score_10 == 1000
    assert norm_10 == 0.1000
    assert classification_10 == "LOW_CONCENTRATION"

    # Effective constituent count test via calculate_portfolio_company_hhi
    items = [
        HHIItem(identifier=f"C_{i}", name=f"Stock {i}", weight_percentage=Decimal("10.0"))
        for i in range(10)
    ]
    res = calculate_portfolio_company_hhi(items, total_portfolio_value=Decimal("1000000.00"))
    assert res.hhi_score == 1000
    assert math.isclose(res.effective_constituent_count, 10.0, rel_tol=1e-2)
    assert res.classification == "LOW_CONCENTRATION"

    # 100 equal holdings
    weights_100 = [Decimal("1.0")] * 100
    score_100, norm_100, classification_100 = calculate_generic_hhi(weights_100)
    assert score_100 == 100
    assert classification_100 == "LOW_CONCENTRATION"


def test_scenario_2_single_stock_monopoly():
    """
    Scenario 2: Single-stock monopoly.
    - 1 holding with 100% of portfolio:
      HHI = 100^2 = 10,000 (absolute maximum).
      Should classify as HIGH_CONCENTRATION (> 2500).
    """
    weights = [Decimal("100.0")]
    score, norm, classification = calculate_generic_hhi(weights)

    assert score == 10000
    assert norm == 1.0000
    assert classification == "HIGH_CONCENTRATION"

    items = [
        HHIItem(identifier="RELIANCE", name="Reliance Industries", weight_percentage=Decimal("100.0"))
    ]
    res = calculate_portfolio_company_hhi(items, total_portfolio_value=Decimal("500000.00"))
    assert res.hhi_score == 10000
    assert math.isclose(res.effective_constituent_count, 1.0, rel_tol=1e-2)
    assert res.top_contributor_name == "Reliance Industries"
    assert res.top_contributor_weight == 100.0
    assert res.classification == "HIGH_CONCENTRATION"


def test_scenario_3_highly_concentrated_portfolio():
    """
    Scenario 3: Highly concentrated portfolio.
    - 2 holdings: 70% in Stock A, 30% in Stock B.
      HHI = 70^2 + 30^2 = 4900 + 900 = 5,800.
      Should classify as HIGH_CONCENTRATION.
    """
    weights = [Decimal("70.0"), Decimal("30.0")]
    score, norm, classification = calculate_generic_hhi(weights)

    assert score == 5800
    assert norm == 0.5800
    assert classification == "HIGH_CONCENTRATION"

    items = [
        HHIItem(identifier="HDFC", name="HDFC Bank", weight_percentage=Decimal("70.0")),
        HHIItem(identifier="ICICI", name="ICICI Bank", weight_percentage=Decimal("30.0")),
    ]
    res = calculate_portfolio_company_hhi(items, total_portfolio_value=Decimal("1000000.00"))
    assert res.hhi_score == 5800
    assert res.top_contributor_name == "HDFC Bank"
    assert res.top_contributor_weight == 70.0
    # Inverse HHI: 1 / (0.70^2 + 0.30^2) = 1 / 0.58 ≈ 1.72 effective constituents
    assert math.isclose(res.effective_constituent_count, 1.724, rel_tol=1e-2)


def test_scenario_4_diversified_mutual_fund_portfolio():
    """
    Scenario 4: Realistic 15-holding diversified mutual fund portfolio.
    Weights: [10, 9, 8, 8, 7, 7, 7, 6, 6, 6, 6, 5, 5, 5, 5] = 100%
    Expected sum of squares:
    100 + 81 + 64 + 64 + 49 + 49 + 49 + 36 + 36 + 36 + 36 + 25 + 25 + 25 + 25 = 700.
    Score = 700 (< 1500), WELL DIVERSIFIED / LOW_CONCENTRATION.
    """
    weights = [
        Decimal("10.0"),
        Decimal("9.0"),
        Decimal("8.0"),
        Decimal("8.0"),
        Decimal("7.0"),
        Decimal("7.0"),
        Decimal("7.0"),
        Decimal("6.0"),
        Decimal("6.0"),
        Decimal("6.0"),
        Decimal("6.0"),
        Decimal("5.0"),
        Decimal("5.0"),
        Decimal("5.0"),
        Decimal("5.0"),
    ]
    assert sum(weights) == Decimal("100.0")

    score, norm, classification = calculate_generic_hhi(weights)
    assert score == 700
    assert norm == 0.0700
    assert classification == "LOW_CONCENTRATION"

    items = [
        HHIItem(identifier=f"FUND_{i}", name=f"Fund Holding {i}", weight_percentage=w)
        for i, w in enumerate(weights)
    ]
    res = calculate_portfolio_company_hhi(items, total_portfolio_value=Decimal("2500000.00"))
    assert res.hhi_score == 700
    assert res.classification == "LOW_CONCENTRATION"
    # Inverse HHI: 1 / 0.0700 ≈ 14.28
    assert math.isclose(res.effective_constituent_count, 14.285, rel_tol=1e-2)


def test_scenario_5_fractional_vs_percentage_weights():
    """
    Scenario 5: Fractional weights vs percentage weights.
    Whether input is provided as decimals in [0.0, 1.0] (e.g. 0.50, 0.50)
    or as percentages in [0.0, 100.0] (e.g. 50.0, 50.0),
    the HHI score must be identically 5,000 on the 0-10,000 scale.
    """
    pct_weights = [Decimal("50.0"), Decimal("50.0")]
    frac_weights = [Decimal("0.50"), Decimal("0.50")]

    score_pct, norm_pct, class_pct = calculate_generic_hhi(pct_weights)
    score_frac, norm_frac, class_frac = calculate_generic_hhi(frac_weights)

    assert score_pct == 5000
    assert score_frac == 5000
    assert norm_pct == norm_frac == 0.5000
    assert class_pct == class_frac == "HIGH_CONCENTRATION"


def test_scenario_6_unmapped_assets_and_empty_portfolios():
    """
    Scenario 6: Edge cases - empty portfolios, zero values, and unmapped assets.
    """
    # Empty portfolio
    score, norm, classification = calculate_generic_hhi([])
    assert score == 0
    assert classification == "NOT_AVAILABLE"

    empty_res = calculate_portfolio_company_hhi([], total_portfolio_value=Decimal("0"))
    assert empty_res.hhi_score == 0
    assert empty_res.classification == "NOT_AVAILABLE"

    # Portfolio with 60% mapped to Infosys and 40% unmapped assets
    items = [
        HHIItem(identifier="INFY", name="Infosys Ltd", weight_percentage=Decimal("60.0"))
    ]
    res = calculate_portfolio_company_hhi(
        items,
        total_portfolio_value=Decimal("100000.00"),
        unmapped_value=Decimal("40000.00"),
    )
    # 60^2 + 40^2 = 3600 + 1600 = 5200
    assert res.hhi_score == 5200
    assert res.unmapped_weight_percentage == 40.0
    assert res.classification == "HIGH_CONCENTRATION"
