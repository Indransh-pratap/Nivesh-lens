from datetime import datetime

from pydantic import BaseModel, Field


class CasOtpRequest(BaseModel):
    """
    Request to initiate a CAS OTP session.
    """

    identifier: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Customer identifier required by the CAS / Account Aggregator provider.",
    )


class CasOtpRequestResponse(BaseModel):
    """
    Response returned after requesting an OTP.
    """

    request_id: str
    status: str
    expires_at: datetime


class CasOtpVerifyRequest(BaseModel):
    """
    Request to verify an OTP for an existing CAS session.
    """

    request_id: str = Field(
        ...,
        min_length=1,
        max_length=255,
    )

    otp: str = Field(
        ...,
        min_length=4,
        max_length=10,
    )


class CasOtpVerifyResponse(BaseModel):
    """
    Response returned after OTP verification with synced portfolio details.
    """

    request_id: str
    status: str
    portfolio_id: str | None = None
    holdings_count: int = 0
    total_value: float = 0.0
    sync_id: str | None = None