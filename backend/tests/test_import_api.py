from app.api import imports


CAS_TEXT = """CAMS Consolidated Account Statement
Scheme: Example Equity Fund
ISIN: INF000000000
Units: 125.42
Average Cost: 142.35
Current Value: 23150.40
"""


def upload(client):
    return client.post("/api/imports/cas", files={"file": ("cas.pdf", b"%PDF-1.7\nfixture", "application/pdf")}, data={"password": ""})


def test_cas_import_is_idempotent(client, monkeypatch):
    monkeypatch.setattr(imports, "decrypt_cas_pdf", lambda *_: CAS_TEXT)
    first = upload(client)
    assert first.status_code == 200
    assert first.json()["status"] == "completed"
    second = upload(client)
    assert second.status_code == 200
    assert second.json()["status"] == "already_imported"


def test_wrong_password_returns_safe_error(client, monkeypatch):
    from app.services.cas.decrypt import WrongPasswordError

    monkeypatch.setattr(imports, "decrypt_cas_pdf", lambda *_: (_ for _ in ()).throw(WrongPasswordError("secret is never exposed")))
    response = upload(client)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "WRONG_PASSWORD"
