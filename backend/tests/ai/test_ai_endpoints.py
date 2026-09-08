from decimal import Decimal
import uuid
import pytest
from fastapi.testclient import TestClient

from app.models.holding import AssetType, Holding
from app.models.portfolio import Portfolio


def test_ai_api_endpoints_full_lifecycle(client: TestClient):
    # 1. Create a portfolio first using existing portfolio endpoint
    resp = client.post("/api/portfolios", json={"name": "AI Test Portfolio"})
    assert resp.status_code == 201
    p_data = resp.json()
    p_id = p_data["id"]

    # 2. Test Analyst explanation
    res_analyst = client.get(f"/api/portfolios/{p_id}/ai/analyst")
    assert res_analyst.status_code == 200
    assert "headline" in res_analyst.json()

    # 3. Test Ask My Portfolio Chat
    res_chat = client.post(f"/api/portfolios/{p_id}/ai/chat", json={"question": "Why is my portfolio risky?"})
    assert res_chat.status_code == 200
    assert "answer" in res_chat.json()

    # 4. Test Phase 2 Stress Test explanation
    res_stress = client.get(f"/api/portfolios/{p_id}/ai/explain/stress-test?scenario=COVID_2020")
    assert res_stress.status_code == 200
    assert "explanation" in res_stress.json()

    # 5. Test Correlation explanation
    res_corr = client.get(f"/api/portfolios/{p_id}/ai/explain/correlation")
    assert res_corr.status_code == 200
    assert "explanation" in res_corr.json()

    # 6. Test Benchmark explanation
    res_bench = client.get(f"/api/portfolios/{p_id}/ai/explain/benchmark")
    assert res_bench.status_code == 200
    assert "explanation" in res_bench.json()

    # 7. Test Group exposure explanation
    res_grp = client.get(f"/api/portfolios/{p_id}/ai/explain/group-exposure")
    assert res_grp.status_code == 200
    assert "explanation" in res_grp.json()

    # 8. Test SIP health explanation
    res_sip = client.get(f"/api/portfolios/{p_id}/ai/explain/sip-health")
    assert res_sip.status_code == 200
    assert "explanation" in res_sip.json()

    # 9. Test Tax implications
    res_tax = client.get(f"/api/portfolios/{p_id}/ai/tax-implications")
    assert res_tax.status_code == 200
    assert "deterministic_tax_calculation" in res_tax.json()

    # 10. Test Tax rebalance agent
    res_rebal = client.post(f"/api/portfolios/{p_id}/ai/tax-rebalance")
    assert res_rebal.status_code == 200
    assert "items" in res_rebal.json()

    # 11. Test IPO/NFO analysis
    res_ipo = client.get(f"/api/portfolios/{p_id}/ai/ipo-nfo?entity_name=Reliance&issue_type=IPO")
    assert res_ipo.status_code == 200
    assert "company_or_scheme_name" in res_ipo.json()

    # 12. Test Promoter intelligence
    res_prom = client.get(f"/api/portfolios/{p_id}/ai/promoter-intelligence?company=TCS")
    assert res_prom.status_code == 200
    assert "findings" in res_prom.json()

    # 13. Test Style drift
    res_drift = client.get(f"/api/portfolios/{p_id}/ai/style-drift")
    assert res_drift.status_code == 200
    assert isinstance(res_drift.json(), list)

    # 14. Test Panic guard
    res_panic = client.get(f"/api/portfolios/{p_id}/ai/panic-guard")
    assert res_panic.status_code == 200

    # 15. Test Holding news
    res_news = client.get(f"/api/portfolios/{p_id}/ai/news")
    assert res_news.status_code == 200
    assert isinstance(res_news.json(), list)

    # 16. Test Dividends
    res_div = client.get(f"/api/portfolios/{p_id}/ai/dividends")
    assert res_div.status_code == 200
    assert "monthly_projections" in res_div.json()

    # 17. Test Advisor report
    res_adv = client.get(f"/api/portfolios/{p_id}/ai/advisor-report?client_name=Amit+Patel")
    assert res_adv.status_code == 200
    assert "executive_summary" in res_adv.json()

    # 18. Test WhatsApp webhook
    res_wa = client.post(
        "/api/ai/whatsapp",
        json={"sender_phone": "+919876543210", "message": "Give me a summary", "portfolio_id": p_id},
    )
    assert res_wa.status_code == 200
    assert "reply_text" in res_wa.json()

    # 19. Test CAS AI Fallback import
    res_cas = client.post(
        "/api/imports/cas-ai-fallback",
        json={"raw_text": "Sample CAS text", "portfolio_name": "Fallback Test"},
    )
    assert res_cas.status_code == 201
    assert "status" in res_cas.json()
