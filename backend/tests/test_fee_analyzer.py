from decimal import Decimal
import pytest

from app.services.diagnostics.fee_analyzer import (
    analyze_portfolio_fees_and_duplicates,
    calculate_compounded_loss,
)


def test_actual_ter_and_regular_plan_bleed():
    # Fund A: ₹2,00,000, TER 1.0%, Direct -> Actual TER = ₹2,000, Reg bleed = 0
    # Fund B: ₹2,00,000, TER 1.75%, Regular -> Actual TER = ₹3,500, Reg bleed = ₹1,500 (0.75%)
    funds = [
        {
            "name": "Fund Direct",
            "isin": "INF001",
            "value": Decimal("200000"),
            "plan_type": "Direct",
            "ter": Decimal("1.00"),
            "underlying": [],
        },
        {
            "name": "Fund Regular",
            "isin": "INF002",
            "value": Decimal("200000"),
            "plan_type": "Regular",
            "ter": Decimal("1.75"),
            "underlying": [],
        },
    ]

    res = analyze_portfolio_fees_and_duplicates(funds)
    assert res.total_mf_value == 400000.0
    assert res.total_actual_ter_cost == 5500.0
    assert res.total_regular_commission_bleed == 1500.0
    assert res.estimated_potential_duplicate_cost == 0.0
    assert res.overlapping_companies_count == 0


def test_duplicate_overlapping_company_cost():
    # Fund A: ₹2,00,000, TER 1.0%, holds Reliance 10% (₹20,000)
    # Fund B: ₹2,00,000, TER 1.0%, holds Reliance 10% (₹20,000)
    # Total Reliance exposure: ₹40,000. Overlap duplicate: ₹20,000.
    # Estimated Potential Duplicate Cost: ₹20,000 * 1.0% = ₹200.
    funds = [
        {
            "name": "Fund A",
            "isin": "INF001",
            "value": Decimal("200000"),
            "plan_type": "Direct",
            "ter": Decimal("1.00"),
            "underlying": [
                {"company_name": "Reliance Industries", "company_isin": "INE002A01018", "weight": Decimal("10.0"), "exposure": Decimal("20000")},
                {"company_name": "TCS", "company_isin": "INE467B01029", "weight": Decimal("10.0"), "exposure": Decimal("20000")},
            ],
        },
        {
            "name": "Fund B",
            "isin": "INF002",
            "value": Decimal("200000"),
            "plan_type": "Direct",
            "ter": Decimal("1.00"),
            "underlying": [
                {"company_name": "Reliance Industries", "company_isin": "INE002A01018", "weight": Decimal("10.0"), "exposure": Decimal("20000")},
                {"company_name": "Infosys", "company_isin": "INE009A01021", "weight": Decimal("10.0"), "exposure": Decimal("20000")},
            ],
        },
    ]

    res = analyze_portfolio_fees_and_duplicates(funds)
    assert res.overlapping_companies_count == 1
    top_overlap = res.top_overlapping_companies[0]
    assert top_overlap["company_name"] == "Reliance Industries"
    assert top_overlap["total_exposure_value"] == 40000.0
    assert top_overlap["duplicate_exposure_value"] == 20000.0
    assert res.estimated_potential_duplicate_cost == 200.0
    assert res.total_annual_bleed_amount == 200.0


def test_missing_ter_is_not_invented():
    funds = [
        {
            "name": "Fund Without TER",
            "isin": "INF999",
            "value": Decimal("100000"),
            "plan_type": "Direct",
            "ter": None,
            "underlying": [],
        }
    ]
    res = analyze_portfolio_fees_and_duplicates(funds)
    assert res.ter_data_missing_funds_count == 1
    assert res.total_actual_ter_cost == 0.0
    f_detail = res.fund_fee_breakdown[0]
    assert f_detail["is_ter_available"] is False
    assert f_detail["annual_actual_cost"] is None


def test_compounded_loss_formula():
    # Annual bleed: 25,000, 12% CAGR
    # 5 years: FV = 25000 * ((1.12^5 - 1) / 0.12) = 25000 * 6.3528 = ~158,821
    loss_5y = calculate_compounded_loss(Decimal("25000"), Decimal("0.12"), 5)
    assert 158000 <= loss_5y <= 160000

    # 10 years: ~438,719
    loss_10y = calculate_compounded_loss(Decimal("25000"), Decimal("0.12"), 10)
    assert 435000 <= loss_10y <= 445000
