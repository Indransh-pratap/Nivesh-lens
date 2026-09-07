from dataclasses import dataclass
from decimal import Decimal
import logging
import re
from typing import Any
import uuid

import httpx

logger = logging.getLogger(__name__)


class NsdlClientError(Exception):
    """Raised when communication with the CAS provider fails."""


@dataclass
class NsdlOtpRequestResult:
    request_id: str
    status: str
    expires_in: int | None = 300


@dataclass
class NsdlOtpVerifyResult:
    request_id: str
    status: str
    cas_data: Any | None = None
    portfolio_id: str | None = None
    holdings_count: int = 0
    total_value: float = 0.0


# Sample sandbox dataset for Account Aggregator / NSDL OTP sync testing
SANDBOX_AA_PORTFOLIO = {
    "accounts": [
        {
            "account_id": "DEMAT_ZERODHA_001",
            "account_name": "Zerodha Broking Ltd",
            "account_type": "Demat",
            "account_number": "1208160012345678",
            "nominee_status": "CONFIRMED",
            "nominee_name": "Pooja Thakur",
            "relationship": "Spouse",
            "allocation_percentage": 100.0,
            "holdings": [
                {
                    "name": "Reliance Industries Ltd",
                    "isin": "INE002A01018",
                    "asset_type": "STOCK",
                    "quantity": "125.0",
                    "average_price": "2480.50",
                    "current_price": "2820.00",
                    "current_value": "352500.00",
                },
                {
                    "name": "HDFC Bank Ltd",
                    "isin": "INE040A01034",
                    "asset_type": "STOCK",
                    "quantity": "220.0",
                    "average_price": "1490.00",
                    "current_price": "1610.00",
                    "current_value": "354200.00",
                },
                {
                    "name": "Tata Consultancy Services Ltd",
                    "isin": "INE467B01029",
                    "asset_type": "STOCK",
                    "quantity": "65.0",
                    "average_price": "3400.00",
                    "current_price": "3850.20",
                    "current_value": "250263.00",
                },
                {
                    "name": "Infosys Ltd",
                    "isin": "INE009A01021",
                    "asset_type": "STOCK",
                    "quantity": "110.0",
                    "average_price": "1450.00",
                    "current_price": "1680.10",
                    "current_value": "184811.00",
                },
            ],
        },
        {
            "account_id": "MF_FOLIO_CAMS_101",
            "account_name": "HDFC Mutual Fund",
            "account_type": "Mutual Fund Folio",
            "folio_number": "11223344 / 56",
            "nominee_status": "CONFIRMED",
            "nominee_name": "Pooja Thakur",
            "relationship": "Spouse",
            "allocation_percentage": 100.0,
            "holdings": [
                {
                    "name": "HDFC Flexi Cap Fund - Direct Plan - Growth",
                    "isin": "INF179K01VY8",
                    "asset_type": "MUTUAL_FUND",
                    "quantity": "2840.125",
                    "average_price": "145.20",
                    "current_price": "171.20",
                    "current_value": "486229.40",
                    "plan_type": "Direct",
                    "expense_ratio": "0.78",
                },
                {
                    "name": "HDFC Balanced Advantage Fund - Direct Plan - Growth",
                    "isin": "INF179K01XQ2",
                    "asset_type": "MUTUAL_FUND",
                    "quantity": "3250.600",
                    "average_price": "71.40",
                    "current_price": "80.66",
                    "current_value": "262193.40",
                    "plan_type": "Direct",
                    "expense_ratio": "0.82",
                },
            ],
        },
        {
            "account_id": "MF_FOLIO_KFIN_202",
            "account_name": "Axis Mutual Fund",
            "account_type": "Mutual Fund Folio",
            "folio_number": "99887766 / 12",
            "nominee_status": "MISSING",
            "nominee_name": None,
            "relationship": None,
            "allocation_percentage": None,
            "holdings": [
                {
                    "name": "Axis Small Cap Fund - Regular Plan - Growth",
                    "isin": "INF846K01EW2",
                    "asset_type": "MUTUAL_FUND",
                    "quantity": "1420.350",
                    "average_price": "190.50",
                    "current_price": "232.58",
                    "current_value": "330345.00",
                    "plan_type": "Regular",
                    "expense_ratio": "1.65",
                },
            ],
        },
        {
            "account_id": "BANK_FD_HDFC_303",
            "account_name": "HDFC Bank Fixed Deposit",
            "account_type": "Fixed Deposit",
            "account_number": "503019283746",
            "nominee_status": "UNKNOWN",
            "nominee_name": None,
            "relationship": None,
            "allocation_percentage": None,
            "holdings": [
                {
                    "name": "Fixed Deposit 1-Year @ 7.1%",
                    "isin": None,
                    "asset_type": "BOND",
                    "quantity": "1.0",
                    "average_price": "200000.00",
                    "current_price": "200000.00",
                    "current_value": "200000.00",
                }
            ],
        },
    ]
}


class NsdlClient:
    """
    Client for Account Aggregator / NSDL CAS API.
    Supports both live HTTP endpoints and verified sandbox simulation.
    """

    def __init__(
        self,
        base_url: str = "",
        api_key: str = "",
        timeout: float = 15.0,
        is_sandbox: bool = False,
    ) -> None:
        self.base_url = base_url.rstrip("/") if base_url else ""
        self.api_key = api_key
        self.timeout = timeout
        self.is_sandbox = is_sandbox or not bool(base_url and api_key and not base_url.startswith("mock://"))

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
        Request an OTP from Account Aggregator / NSDL CAS provider.
        """
        clean_id = identifier.strip()
        if not clean_id:
            raise NsdlClientError("Identifier (PAN or mobile number) is required.")

        if not self.is_sandbox and self.base_url:
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(
                        f"{self.base_url}/v1/otp/request",
                        headers=self._headers(),
                        json={"identifier": clean_id},
                    )
                    resp.raise_for_status()
                    payload = resp.json()
                    return NsdlOtpRequestResult(
                        request_id=payload["request_id"],
                        status=payload.get("status", "pending"),
                        expires_in=payload.get("expires_in", 300),
                    )
            except Exception as exc:
                logger.exception("NSDL live request_otp failed: %s", exc)
                raise NsdlClientError(f"Failed to communicate with CAS provider: {exc}") from exc

        # Sandbox / Mock fallback
        request_id = f"req_{uuid.uuid4().hex[:16]}"
        logger.info("NSDL Sandbox: Generated OTP request_id=%s for identifier=%s", request_id, clean_id[:4] + "***")
        return NsdlOtpRequestResult(
            request_id=request_id,
            status="pending",
            expires_in=300,
        )

    async def verify_otp(
        self,
        request_id: str,
        otp: str,
    ) -> NsdlOtpVerifyResult:
        """
        Verify an OTP with Account Aggregator / NSDL CAS provider.
        """
        clean_otp = otp.strip()
        if not clean_otp or len(clean_otp) < 4:
            raise NsdlClientError("Please enter a valid OTP.")

        if not self.is_sandbox and self.base_url:
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(
                        f"{self.base_url}/v1/otp/verify",
                        headers=self._headers(),
                        json={"request_id": request_id, "otp": clean_otp},
                    )
                    resp.raise_for_status()
                    payload = resp.json()
                    return NsdlOtpVerifyResult(
                        request_id=request_id,
                        status=payload.get("status", "verified"),
                        cas_data=payload.get("portfolio_data"),
                    )
            except Exception as exc:
                logger.exception("NSDL live verify_otp failed: %s", exc)
                raise NsdlClientError(f"OTP verification failed: {exc}") from exc

        # Sandbox verification:
        # Rejects obvious bad test OTP "000000" to allow testing error states
        if clean_otp == "000000":
            raise NsdlClientError("Invalid OTP entered. Please try again.")

        return NsdlOtpVerifyResult(
            request_id=request_id,
            status="verified",
            cas_data=SANDBOX_AA_PORTFOLIO,
        )