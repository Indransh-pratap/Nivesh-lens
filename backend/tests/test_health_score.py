from decimal import Decimal
import pytest

from app.services.diagnostics.health_score_engine import (
    calculate_health_score,
    DEFAULT_CONFIG,
)


def test_empty_portfolio_health_score():
    res = calculate_health_score(
        total_portfolio_value=Decimal("0"),
        hhi_score=0,
        max_company_pct=Decimal("0"),
        top_company_name=None,
        asset_class_weights={},
        regular_plan_val=Decimal("0"),
        total_mf_val=Decimal("0"),
    )
    assert res.overall_score == 300
    assert res.rating_grade == "Vulnerable"
    assert res.percentile_rank == 1


def test_single_stock_extreme_concentration():
    # 100% in 1 stock, no asset spread, no nominee
    res = calculate_health_score(
        total_portfolio_value=Decimal("1000000"),
        hhi_score=10000,
        max_company_pct=Decimal("100.0"),
        top_company_name="Single Stock Ltd",
        asset_class_weights={"EQUITY": Decimal("100.0")},
        regular_plan_val=Decimal("0"),
        total_mf_val=Decimal("0"),
        total_accounts=1,
        confirmed_nominee_accounts=0,
        missing_nominee_accounts=1,
    )
    assert 300 <= res.overall_score <= 500
    assert res.rating_grade == "Vulnerable"
    # Single company exposure pillar should be 0 or heavily penalized
    sp_conc = next(p for p in res.sub_pillars if p.id == "sp_concentration")
    assert sp_conc.status == "Critical"
    assert sp_conc.score == 0


def test_highly_diversified_portfolio():
    # 15 stocks/funds, max company 6%, HHI 750, good asset spread (Equity 65%, Debt 25%, Cash 10%), 100% Direct, all nominees verified
    res = calculate_health_score(
        total_portfolio_value=Decimal("5000000"),
        hhi_score=750,
        max_company_pct=Decimal("6.0"),
        top_company_name="HDFC Bank",
        asset_class_weights={"EQUITY": Decimal("65.0"), "DEBT": Decimal("25.0"), "CASH": Decimal("10.0")},
        regular_plan_val=Decimal("0"),
        total_mf_val=Decimal("2000000"),
        overlap_pct=Decimal("10.0"),
        total_accounts=4,
        confirmed_nominee_accounts=4,
        missing_nominee_accounts=0,
    )
    assert res.overall_score >= 800
    assert res.rating_grade == "Prime"
    assert len(res.sub_pillars) == 4
    for p in res.sub_pillars:
        assert p.status == "Optimal"
        assert p.score > p.max_score * 0.75


def test_regular_plan_commission_deduction():
    # Comparing 100% direct vs 100% regular
    res_direct = calculate_health_score(
        total_portfolio_value=Decimal("1000000"),
        hhi_score=1200,
        max_company_pct=Decimal("8.0"),
        top_company_name="Infosys",
        asset_class_weights={"EQUITY": Decimal("70.0"), "DEBT": Decimal("30.0")},
        regular_plan_val=Decimal("0"),
        total_mf_val=Decimal("1000000"),
    )
    res_regular = calculate_health_score(
        total_portfolio_value=Decimal("1000000"),
        hhi_score=1200,
        max_company_pct=Decimal("8.0"),
        top_company_name="Infosys",
        asset_class_weights={"EQUITY": Decimal("70.0"), "DEBT": Decimal("30.0")},
        regular_plan_val=Decimal("1000000"),
        total_mf_val=Decimal("1000000"),
    )
    assert res_direct.overall_score > res_regular.overall_score
    sp_eff_direct = next(p for p in res_direct.sub_pillars if p.id == "sp_scheme_overlap")
    sp_eff_reg = next(p for p in res_regular.sub_pillars if p.id == "sp_scheme_overlap")
    assert sp_eff_direct.score > sp_eff_reg.score


def test_nominee_missing_deduction():
    res_nominee_ok = calculate_health_score(
        total_portfolio_value=Decimal("1000000"),
        hhi_score=1200,
        max_company_pct=Decimal("8.0"),
        top_company_name="TCS",
        asset_class_weights={"EQUITY": Decimal("100.0")},
        regular_plan_val=Decimal("0"),
        total_mf_val=Decimal("0"),
        total_accounts=2,
        confirmed_nominee_accounts=2,
        missing_nominee_accounts=0,
    )
    res_nominee_missing = calculate_health_score(
        total_portfolio_value=Decimal("1000000"),
        hhi_score=1200,
        max_company_pct=Decimal("8.0"),
        top_company_name="TCS",
        asset_class_weights={"EQUITY": Decimal("100.0")},
        regular_plan_val=Decimal("0"),
        total_mf_val=Decimal("0"),
        total_accounts=2,
        confirmed_nominee_accounts=0,
        missing_nominee_accounts=2,
    )
    assert res_nominee_ok.overall_score > res_nominee_missing.overall_score
