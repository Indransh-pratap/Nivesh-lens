from app.core.security import get_current_user_id
from app.main import app


def setup_portfolio_with_holdings(client):
    res = client.post("/api/portfolios", json={"name": "Phase 2 Test Portfolio"})
    p_id = res.json()["id"]
    return p_id


def test_stress_test_endpoint(client):
    p_id = setup_portfolio_with_holdings(client)
    res = client.get(f"/api/portfolios/{p_id}/stress-tests?scenario=COVID_2020")
    assert res.status_code == 200
    body = res.json()
    assert body["scenario"] == "COVID_2020"
    assert "estimated_loss" in body
    assert "loss_percent" in body
    assert "ending_value" in body
    assert "data_coverage" in body


def test_stress_test_run_post(client):
    p_id = setup_portfolio_with_holdings(client)
    res = client.post(f"/api/portfolios/{p_id}/stress-tests/run", json={"scenario_id": "CRISIS_2008"})
    assert res.status_code == 200
    body = res.json()
    assert body["scenario"] == "CRISIS_2008"


def test_correlation_matrix(client):
    p_id = setup_portfolio_with_holdings(client)
    res = client.get(f"/api/portfolios/{p_id}/correlation")
    assert res.status_code == 200
    body = res.json()
    assert "matrix" in body
    assert "pairs" in body
    assert "thresholds" in body


def test_fund_swap_simulation(client):
    p_id = setup_portfolio_with_holdings(client)
    res = client.post(
        f"/api/portfolios/{p_id}/fund-swap",
        json={"target_holding_id": "holding-1", "replacement_scheme_code": "100033"}
    )
    assert res.status_code == 200
    body = res.json()
    assert "before" in body
    assert "after" in body
    assert "delta" in body
    assert "disclaimer" in body


def test_peer_benchmark(client):
    p_id = setup_portfolio_with_holdings(client)
    res = client.get(f"/api/portfolios/{p_id}/benchmark")
    assert res.status_code == 200
    body = res.json()
    assert "portfolio_hhi" in body
    assert "reference_hhi" in body
    assert "relative_position" in body


def test_group_exposure(client):
    p_id = setup_portfolio_with_holdings(client)
    res = client.get(f"/api/portfolios/{p_id}/group-exposure")
    assert res.status_code == 200
    body = res.json()
    assert "groups" in body
    assert "unmapped_percentage" in body


def test_sip_health(client):
    p_id = setup_portfolio_with_holdings(client)
    res = client.get(f"/api/portfolios/{p_id}/sip-health")
    assert res.status_code == 200
    body = res.json()
    assert "overall_score" in body
    assert "overall_rating" in body
    assert "sips" in body


def test_unauthorized_user_access_blocked(client):
    p_id = setup_portfolio_with_holdings(client)

    async def another_user() -> str:
        return "user-two"

    app.dependency_overrides[get_current_user_id] = another_user
    res = client.get(f"/api/portfolios/{p_id}/stress-tests")
    assert res.status_code == 404
