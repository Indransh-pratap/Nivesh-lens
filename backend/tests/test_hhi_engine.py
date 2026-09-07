from decimal import Decimal
import pytest

from app.services.diagnostics.hhi_engine import (
    HHIItem,
    calculate_generic_hhi,
    calculate_portfolio_company_hhi,
)


def test_hhi_single_stock_monopoly():
    # 100% in one stock -> 100^2 = 10,000
    score, normalized, classification = calculate_generic_hhi([Decimal("100")])
    assert score == 10000
    assert normalized == 1.0
    assert classification == "HIGH_CONCENTRATION"


def test_hhi_two_equal_holdings():
    # 50% + 50% -> 2500 + 2500 = 5,000
    score, normalized, classification = calculate_generic_hhi([Decimal("50"), Decimal("50")])
    assert score == 5000
    assert normalized == 0.5
    assert classification == "HIGH_CONCENTRATION"


def test_hhi_ten_equal_holdings_well_diversified():
    # 10 * 10% -> 10 * 100 = 1,000
    score, normalized, classification = calculate_generic_hhi([Decimal("10")] * 10)
    assert score == 1000
    assert normalized == 0.1
    assert classification == "LOW_CONCENTRATION"


def test_hhi_five_equal_holdings_moderate():
    # 5 * 20% -> 5 * 400 = 2,000
    score, normalized, classification = calculate_generic_hhi([Decimal("20")] * 5)
    assert score == 2000
    assert normalized == 0.2
    assert classification == "MODERATE_CONCENTRATION"


def test_hhi_fractional_weights():
    # Weights given as fractions: 0.5 and 0.5
    score, normalized, classification = calculate_generic_hhi([Decimal("0.5"), Decimal("0.5")])
    assert score == 5000
    assert normalized == 0.5


def test_hhi_empty_and_zero_values():
    score, normalized, classification = calculate_generic_hhi([])
    assert score == 0
    assert normalized == 0.0
    assert classification == "NOT_AVAILABLE"

    score_zero, _, class_zero = calculate_generic_hhi([Decimal("0"), Decimal("0")])
    assert score_zero == 0
    assert class_zero == "NOT_AVAILABLE"


def test_portfolio_company_hhi_with_unmapped():
    items = [
        HHIItem(identifier="C1", name="Reliance Industries", weight_percentage=Decimal("30.0")),
        HHIItem(identifier="C2", name="HDFC Bank", weight_percentage=Decimal("30.0")),
        HHIItem(identifier="C3", name="TCS", weight_percentage=Decimal("20.0")),
    ]
    # Total portfolio: 1,00,000, unmapped: 20,000 (20%)
    # Weights: 30%, 30%, 20%, 20% -> 900 + 900 + 400 + 400 = 2600
    res = calculate_portfolio_company_hhi(
        company_exposures=items,
        total_portfolio_value=Decimal("100000"),
        unmapped_value=Decimal("20000"),
    )
    assert res.hhi_score == 2600
    assert res.classification == "HIGH_CONCENTRATION"
    assert res.top_contributor_name == "Reliance Industries"
    assert res.top_contributor_weight == 30.0
    assert res.unmapped_weight_percentage == 20.0
    assert res.constituents_evaluated == 4
