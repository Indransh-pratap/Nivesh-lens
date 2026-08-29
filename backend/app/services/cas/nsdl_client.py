from dataclasses import dataclass
from typing import Any

import httpx


class NsdlClientError(Exception):
    """Raised when communication with the CAS provider fails."""


@dataclass
class NsdlOtpRequestResult:
    request_id: str
    status: str
    expires_in: int | None = None


@dataclass
class NsdlOtpVerifyResult:
    request_id: str
    status: str
    cas_data: Any | None = None


class NsdlClient:
    """
    Client for the NSDL CAS API.

    The actual endpoint paths and payloads must match the
    official NSDL API specification.
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        timeout: float = 15.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

    def _headers(self) -> dict[str, str]:
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
        }

    async def request_otp(
        self,
        identifier: str,
    ) -> NsdlOtpRequestResult:
        """
        Request an OTP from NSDL.

        TODO:
        Replace the endpoint and payload with the values from
        the official NSDL API specification.
        """

        raise NotImplementedError(
            "NSDL OTP request endpoint is not configured yet."
        )

    async def verify_otp(
        self,
        request_id: str,
        otp: str,
    ) -> NsdlOtpVerifyResult:
        """
        Verify an OTP with NSDL.

        TODO:
        Replace the endpoint and payload with the values from
        the official NSDL API specification.
        """

        raise NotImplementedError(
            "NSDL OTP verification endpoint is not configured yet."
        )