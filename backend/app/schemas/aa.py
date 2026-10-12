from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class CreateConsentRequest(BaseModel):
    mobile_number: str = Field(
        ...,
        min_length=10,
        max_length=10,
        description="10 digit Indian mobile number",
    )

    # Optional frontend redirect.
    redirect_url: str | None = None


class CreateConsentResponse(BaseModel):
    consent_id: str
    consent_url: str
    status: str


class ConsentStatusResponse(BaseModel):
    consent_id: str
    status: str
    raw: dict[str, Any]


class DataSessionResponse(BaseModel):
    session_id: str
    status: str
    raw: dict[str, Any]


class SetuWebhook(BaseModel):
    """
    Setu webhook structure is intentionally flexible because
    different notification types contain different payloads.
    """

    type: str | None = None
    consentId: str | None = None
    notificationId: str | None = None

    success: bool | None = None

    status: str | None = None

    timestamp: str | None = None

    data: dict[str, Any] | None = None

    error: dict[str, Any] | None = None

    model_config = {
        "extra": "allow"
    }