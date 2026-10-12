from app.api import imports

CAS_A = """CAMS Consolidated Account Statement
Scheme: Alpha Fund
ISIN: INF000000001
Units: 10
Average Cost: 100
Current Value: 1000
"""
CAS_B = """CAMS Consolidated Account Statement
Scheme: Beta Fund
ISIN: INF000000002
Units: 20
Average Cost: 100
Current Value: 2000
"""

def upload(client, name, content):
    return client.post("/api/imports/cas", files={"file": (name, content, "application/pdf")}, data={"password": ""})

def test_second_cas_replaces_canonical_snapshot_and_portfolio_api_agrees(client, monkeypatch):
    texts = iter([CAS_A, CAS_B])
    monkeypatch.setattr(imports, "decrypt_cas_pdf", lambda *_: next(texts))
    first = upload(client, "a.pdf", b"%PDF-1.7\na")
    second = upload(client, "b.pdf", b"%PDF-1.7\nb")
    assert first.status_code == second.status_code == 200
    assert first.json()["portfolio_id"] == second.json()["portfolio_id"]
    assert second.json()["holdings_count"] == 1
    assert second.json()["holdings"][0]["name"] == "Beta Fund"
    portfolios = client.get("/api/portfolios").json()
    canonical = next(item for item in portfolios if item["name"] == "CAS Portfolio")
    assert canonical["id"] == second.json()["portfolio_id"]
    assert [holding["name"] for holding in canonical["holdings"]] == ["Beta Fund"]
    assert canonical["total_value"] == 2000

def test_failed_second_import_keeps_previous_snapshot(client, monkeypatch):
    texts = iter([CAS_A, "not a CAS statement"])
    monkeypatch.setattr(imports, "decrypt_cas_pdf", lambda *_: next(texts))
    assert upload(client, "a.pdf", b"%PDF-1.7\na").status_code == 200
    assert upload(client, "bad.pdf", b"%PDF-1.7\nb").status_code == 422
    canonical = next(item for item in client.get("/api/portfolios").json() if item["name"] == "CAS Portfolio")
    assert [holding["name"] for holding in canonical["holdings"]] == ["Alpha Fund"]
