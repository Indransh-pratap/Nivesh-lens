from app.services.ai.phase2_explanations import (
    explain_benchmark,
    explain_correlation,
    explain_fund_swap,
    explain_group_exposure,
    explain_sip_health,
    explain_stress_test,
)


def test_explain_stress_test():
    det_input = {
        "scenario": "COVID_2020",
        "scenario_name": "COVID-19 Market Crash",
        "starting_value": 100000.0,
        "estimated_loss": 25000.0,
        "loss_percent": 25.0,
        "data_coverage": 100.0,
        "missing_assets": [],
    }
    exp = explain_stress_test(det_input)
    assert exp is not None
    assert exp.scenario_or_risk_type == "COVID_2020"
    assert exp.deterministic_metric_value == 25.0
    assert len(exp.explanation) > 0


def test_explain_fund_swap():
    det_input = {
        "target_holding": "HDFC Top 100",
        "replacement_scheme": "Parag Parikh Flexi Cap",
        "before": {"score": 620, "hhi": 1800.0, "average_ter": 1.75},
        "after": {"score": 680, "hhi": 1400.0, "average_ter": 0.85},
        "delta": {"score": 60, "hhi": -400.0, "average_ter": -0.90},
    }
    res = explain_fund_swap(det_input)
    assert res is not None
    assert "explanation" in res
    assert res["deterministic_delta"]["score"] == 60


def test_explain_correlation():
    det_input = {
        "funds": ["Fund A", "Fund B"],
        "pairs": [
            {"fund_a": "Fund A", "fund_b": "Fund B", "correlation": 0.92, "classification": "HIGH"}
        ],
    }
    res = explain_correlation(det_input)
    assert res is not None
    assert "explanation" in res
    assert res["high_correlation_pairs_count"] == 1


def test_explain_benchmark():
    det_input = {
        "portfolio_hhi": 1850.0,
        "reference_hhi": 1200.0,
        "relative_position": "HIGH",
        "largest_company_exposure": 24.5,
        "reference_largest_company": 12.0,
    }
    res = explain_benchmark(det_input)
    assert res is not None
    assert "explanation" in res
    assert res["relative_position"] == "HIGH"


def test_explain_group_exposure():
    det_input = {
        "highest_group": "Tata Group",
        "total_group_exposure_pct": 22.4,
        "groups": [{"group_name": "Tata Group", "exposure_value": 22400.0}],
    }
    res = explain_group_exposure(det_input)
    assert res is not None
    assert res["highest_group"] == "Tata Group"


def test_explain_sip_health():
    det_input = {
        "portfolio_sip_grade": "B+",
        "review_needed_count": 1,
        "sips": [{"scheme_name": "Lagging Small Cap", "grade": "C", "review_needed": True}],
    }
    res = explain_sip_health(det_input)
    assert res is not None
    assert res["portfolio_sip_grade"] == "B+"
    assert res["review_needed"] == 1
