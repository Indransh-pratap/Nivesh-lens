import asyncio
import pytest

from app.services.cas.nsdl_client import NsdlClient, NsdlClientError

def test_unconfigured_otp_client_never_falls_back_to_fixture_portfolio():
    client = NsdlClient(base_url="", api_key="", is_sandbox=False)
    with pytest.raises(NsdlClientError, match="not configured"):
        asyncio.run(client.request_otp("9876543210"))

def test_explicit_sandbox_is_the_only_fixture_mode():
    client = NsdlClient(base_url="", api_key="", is_sandbox=True)
    request = asyncio.run(client.request_otp("9876543210"))
    result = asyncio.run(client.verify_otp(request.request_id, "123456"))
    assert result.status == "verified"
    assert result.cas_data is not None
