from app.api.routes import aa

async def consent(mobile, redirect):
    return {"consent_id":"consent-1","consent_url":"https://setu.example/consent","status":"PENDING","detail":{"dataRange":{"from":"2026-01-01T00:00:00Z","to":"2026-02-01T00:00:00Z"}}}

async def get_consent(_):
    return {"id":"consent-1","status":"ACTIVE","detail":{"dataRange":{"from":"2026-01-01T00:00:00Z","to":"2026-02-01T00:00:00Z"}}}

async def create_session(*_): return {"id":"session-1","status":"PENDING"}

async def completed(_):
    return {"id":"session-1","status":"COMPLETED","fips":[{"fipID":"Demo Bank","accounts":[{"linkRefNumber":"link-1","maskedAccNumber":"XXXX1234","data":{"account":{"summary":{"currentBalance":"12.50","currency":"INR","balanceDateTime":"2026-01-10T00:00:00Z","type":"SAVINGS"},"transactions":{"transaction":[{"txnId":"txn-1","transactionTimestamp":"2026-01-10T00:00:00Z","amount":"4.50","type":"DEBIT","narration":"Coffee","currentBalance":"8"}]}}}}]}]}

def test_aa_sync_persists_and_is_idempotent(client, monkeypatch):
    monkeypatch.setattr(aa, "create_account_aggregator_consent", consent); monkeypatch.setattr(aa.client,"get_consent",get_consent); monkeypatch.setattr(aa.client,"create_data_session",create_session); monkeypatch.setattr(aa.client,"get_data_session",completed)
    r=client.post("/api/aa/consent",json={"mobile_number":"9876543210"}); assert r.status_code==200
    r=client.post("/api/aa/consent/consent-1/data-session"); assert r.status_code==200 and r.json()["status"]=="PENDING"
    r=client.post("/api/aa/sessions/session-1/poll"); assert r.status_code==200 and r.json()["status"]=="COMPLETED"
    assert len(client.get("/api/aa/accounts").json())==1
    assert len(client.get("/api/aa/transactions").json()["items"])==1
    assert client.post("/api/aa/sessions/session-1/poll").status_code==200
    assert len(client.get("/api/aa/transactions").json()["items"])==1

def test_aa_user_isolation(client, monkeypatch):
    monkeypatch.setattr(aa, "create_account_aggregator_consent", consent)
    assert client.post("/api/aa/consent",json={"mobile_number":"9876543210"}).status_code==200
    async def other(): return "user-two"
    from app.core.security import get_current_user_id
    from app.main import app
    app.dependency_overrides[get_current_user_id]=other
    assert client.get("/api/aa/consent/consent-1").status_code==404
