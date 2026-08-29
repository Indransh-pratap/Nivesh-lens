from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.cas_otp import CasOtpSession
from app.services.cas.nsdl_client import (
    NsdlClient,
    NsdlOtpRequestResult,
    NsdlOtpVerifyResult,
)


OTP_SESSION_TTL_SECONDS = 300
MAX_OTP_ATTEMPTS = 5


class CasOtpServiceError(Exception):
    """Raised when a CAS OTP workflow operation fails."""


class CasOtpService:
    def __init__(self, nsdl_client: NsdlClient) -> None:
        self.nsdl_client = nsdl_client

    async def request_otp(
        self,
        db: Session,
        user_id: str,
        identifier: str,
    ) -> CasOtpSession:
        """
        Start a new CAS OTP session.

        The OTP itself is never stored in our database.
        """

        result: NsdlOtpRequestResult = await self.nsdl_client.request_otp(
            identifier=identifier,
        )

        expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=OTP_SESSION_TTL_SECONDS
        )

        session = CasOtpSession(
            id=uuid4(),
            user_id=user_id,
            request_id=result.request_id,
            status="pending",
            attempts=0,
            expires_at=expires_at,
        )

        db.add(session)
        db.commit()
        db.refresh(session)

        return session

    async def verify_otp(
        self,
        db: Session,
        user_id: str,
        request_id: str,
        otp: str,
    ) -> NsdlOtpVerifyResult:
        """
        Verify an OTP belonging to the authenticated user.
        """

        session = db.scalar(
            select(CasOtpSession).where(
                CasOtpSession.request_id == request_id,
                CasOtpSession.user_id == user_id,
            )
        )

        if session is None:
            raise CasOtpServiceError("OTP session not found.")

        now = datetime.now(timezone.utc)

        if session.status != "pending":
            raise CasOtpServiceError("OTP session is no longer active.")

        if session.expires_at <= now:
            session.status = "expired"
            db.commit()
            raise CasOtpServiceError("OTP session has expired.")

        if session.attempts >= MAX_OTP_ATTEMPTS:
            session.status = "failed"
            db.commit()
            raise CasOtpServiceError("Maximum OTP attempts exceeded.")

        session.attempts += 1

        try:
            result = await self.nsdl_client.verify_otp(
                request_id=request_id,
                otp=otp,
            )
        except Exception:
            db.commit()
            raise

        if result.status.lower() in {"verified", "success", "completed"}:
            session.status = "verified"
        else:
            if session.attempts >= MAX_OTP_ATTEMPTS:
                session.status = "failed"

        db.commit()

        return result