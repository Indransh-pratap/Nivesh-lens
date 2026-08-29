from datetime import datetime

from pydantic import BaseModel, Field


class CasOtpRequest(BaseModel):
    """
    Request to initiate a CAS OTP session.

    The actual fields required by NSDL will be added once
    the official NSDL API specification is available.
    """

    identifier: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Customer identifier required by the CAS provider.",
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
    Response returned after OTP verification.
    """

    request_id: str
    status: str
    