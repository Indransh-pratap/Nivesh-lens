
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.config import settings
from app.services.setu.client import SetuClient

setu_client = SetuClient()


async def create_account_aggregator_consent(
    mobile_number: str,
    redirect_url: str | None = None,
) -> dict[str, Any]:
    """
    Create an Account Aggregator consent request through Setu.

    The customer completes authentication and grants consent on Setu's
    hosted consent screen. This endpoint does not collect or verify OTPs.
    """

    mobile = "".join(ch for ch in mobile_number if ch.isdigit())

    # Accept either a 10-digit Indian mobile number or a number with 91.
    if mobile.startswith("91") and len(mobile) == 12:
        mobile = mobile[2:]

    if len(mobile) != 10 or mobile[0] not in "6789":
        raise ValueError("Enter a valid 10-digit Indian mobile number.")

    now = datetime.now(timezone.utc)
    # This is the requested range; subsequent data fetches always use the
    # range returned in the approved consent rather than inventing a range.
    data_from = now - timedelta(days=settings.aa_requested_data_range_days)

    callback_url = (
        redirect_url
        or f"{settings.frontend_url.rstrip('/')}/aa-callback"
    )

    # These values must match the schema and supported FI types
    # configured for your Setu Account Aggregator Data product.
    payload = {
        "consentDuration": {
            "unit": settings.aa_consent_duration_unit,
            "value": settings.aa_consent_duration_value,
        },
        "fetchType": settings.aa_fetch_type,
        "consentMode": "STORE",
      "fiTypes": ["DEPOSIT"],
        "dataRange": {
            "from": data_from.isoformat(timespec="milliseconds").replace(
                "+00:00", "Z"
            ),
            "to": now.isoformat(timespec="milliseconds").replace(
                "+00:00", "Z"
            ),
        },
        "purpose": {
            "code": settings.aa_purpose_code,
            "text": settings.aa_purpose_text,
            "refUri": settings.aa_purpose_ref_uri or (
                f"https://api.rebit.org.in/aa/purpose/{settings.aa_purpose_code}.xml"
            ),
            "category": {
                "type": "PERSONAL_FINANCE",
            },
        },
        "vua": mobile,
        "redirectUrl": callback_url,
    }

    try:
        response = await setu_client.create_consent(payload)
    except Exception as exc:
        # Preserve the actual Setu response in your backend logs.
        print(f"Setu consent creation failed: {exc}")
        raise

    consent_id = response.get("id")
    consent_url = response.get("url")

    if not consent_id or not consent_url:
        raise RuntimeError(
            f"Setu response did not include consent id and URL: {response}"
        )

    return {
        "consent_id": consent_id,
        "consent_url": consent_url,
        "status": response.get("status", "PENDING"),
        "detail": response.get("detail") or {},
    }
