import pytest
from sqlalchemy import select

from app.models.holding import Holding
from app.models.portfolio import Portfolio
from app.models.import_record import ImportRecord, SourceType, ImportStatus


def test_otp_sync_pipeline_end_to_end(client):
    # 1. Request OTP
    req_resp = client.post(
        "/api/cas/otp/request",
        json={"identifier": "9876543210"},
    )
    assert req_resp.status_code == 200
    req_data = req_resp.json()
    request_id = req_data["request_id"]
    assert request_id.startswith("req_")
    assert req_data["status"] == "pending"

    # 2. Verify with invalid OTP
    bad_resp = client.post(
        "/api/cas/otp/verify",
        json={"request_id": request_id, "otp": "000000"},
    )
    assert bad_resp.status_code == 400
    assert "invalid" in bad_resp.json()["detail"].lower()

    # 3. Verify with valid OTP -> Ingests portfolio
    verify_resp = client.post(
        "/api/cas/otp/verify",
        json={"request_id": request_id, "otp": "123456"},
    )
    assert verify_resp.status_code == 200
    verify_data = verify_resp.json()
    assert verify_data["status"] == "verified"
    assert verify_data["portfolio_id"] is not None
    assert verify_data["holdings_count"] > 0
    assert verify_data["total_value"] > 0
    portfolio_id = verify_data["portfolio_id"]
    initial_count = verify_data["holdings_count"]
    initial_val = verify_data["total_value"]

    # 4. Fetch the synced portfolio via Portfolio API
    port_resp = client.get(f"/api/portfolios/{portfolio_id}")
    assert port_resp.status_code == 200
    port_data = port_resp.json()
    assert len(port_data["holdings"]) == initial_count
    assert float(port_data["total_value"]) == initial_val

    # 5. IDEMPOTENCY TEST: Repeat sync with a new request
    # Repeated sync must NOT double count holdings!
    req_resp2 = client.post(
        "/api/cas/otp/request",
        json={"identifier": "9876543210"},
    )
    assert req_resp2.status_code == 200
    req_id2 = req_resp2.json()["request_id"]

    verify_resp2 = client.post(
        "/api/cas/otp/verify",
        json={"request_id": req_id2, "otp": "123456"},
    )
    assert verify_resp2.status_code == 200
    verify_data2 = verify_resp2.json()
    # Holdings count and value must remain identical, NOT doubled!
    assert verify_data2["holdings_count"] == initial_count
    assert verify_data2["total_value"] == initial_val

    # Check via API again
    port_resp2 = client.get(f"/api/portfolios/{portfolio_id}")
    assert port_resp2.status_code == 200
    assert len(port_resp2.json()["holdings"]) == initial_count
    assert float(port_resp2.json()["total_value"]) == initial_val


def test_otp_attempt_limits(client):
    req_resp = client.post(
        "/api/cas/otp/request",
        json={"identifier": "9876543211"},
    )
    req_id = req_resp.json()["request_id"]

    # Fail 5 times
    for _ in range(5):
        resp = client.post(
            "/api/cas/otp/verify",
            json={"request_id": req_id, "otp": "000000"},
        )
        assert resp.status_code == 400

    # 6th attempt: session failed / max attempts exceeded
    locked_resp = client.post(
        "/api/cas/otp/verify",
        json={"request_id": req_id, "otp": "123456"},
    )
    assert locked_resp.status_code == 400
    assert "exceeded" in locked_resp.json()["detail"].lower() or "active" in locked_resp.json()["detail"].lower()
