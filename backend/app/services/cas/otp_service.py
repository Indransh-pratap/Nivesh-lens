from datetime import datetime, timedelta, timezone
from decimal import Decimal
import hashlib
import logging
from uuid import uuid4

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.cas_otp import CasOtpSession
from app.models.holding import AssetType, Holding
from app.models.import_record import ImportRecord, ImportStatus, SourceType
from app.models.portfolio import Portfolio
from app.services.cas.nsdl_client import (
    NsdlClient,
    NsdlOtpRequestResult,
    NsdlOtpVerifyResult,
)

logger = logging.getLogger(__name__)

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

    def _ingest_portfolio_data(
        self,
        db: Session,
        user_id: str,
        request_id: str,
        cas_data: dict,
    ) -> tuple[Portfolio, int, Decimal]:
        """
        Idempotently ingest verified Account Aggregator / CAS data into the user's portfolio.
        Guarantees that repeated syncs never double count holdings.
        """
        now = datetime.now(timezone.utc)

        # 1. Find or create Portfolio
        portfolio = db.scalar(
            select(Portfolio).where(
                Portfolio.user_id == user_id,
                Portfolio.name.in_(["Synced Portfolio", "CAS Portfolio"]),
            )
        )

        if portfolio is None:
            portfolio = Portfolio(
                user_id=user_id,
                name="Synced Portfolio",
                total_value=Decimal("0"),
            )
            db.add(portfolio)
            db.flush()

        # 2. Idempotency: Clear existing holdings for this portfolio before re-populating
        db.execute(delete(Holding).where(Holding.portfolio_id == portfolio.id))
        db.flush()

        # 3. Create canonical holdings from accounts
        total_value = Decimal("0")
        holdings_created = 0
        accounts = cas_data.get("accounts", [])

        for acc in accounts:
            acc_holdings = acc.get("holdings", [])
            for h in acc_holdings:
                qty = Decimal(str(h.get("quantity", 0)))
                cur_price = Decimal(str(h.get("current_price", 0)))
                avg_price = Decimal(str(h.get("average_price", cur_price)))
                cur_val = Decimal(str(h.get("current_value", qty * cur_price)))

                raw_type = str(h.get("asset_type", "STOCK")).upper()
                asset_type = (
                    AssetType.MUTUAL_FUND if "MUTUAL" in raw_type
                    else AssetType.BOND if "BOND" in raw_type or "FD" in raw_type
                    else AssetType.ETF if "ETF" in raw_type
                    else AssetType.CASH if "CASH" in raw_type
                    else AssetType.STOCK
                )

                holding = Holding(
                    portfolio_id=portfolio.id,
                    asset_type=asset_type,
                    name=str(h.get("name", "Unnamed Holding")).strip(),
                    isin=str(h["isin"]).strip().upper() if h.get("isin") else None,
                    quantity=qty,
                    average_price=avg_price,
                    current_price=cur_price,
                    invested_value=avg_price * qty if avg_price > 0 and qty > 0 else cur_val,
                    current_value=cur_val,
                )
                db.add(holding)
                total_value += cur_val
                holdings_created += 1

        portfolio.total_value = total_value

        # 4. Record sync audit trail
        doc_hash = hashlib.sha256(f"{user_id}:{request_id}".encode("utf-8")).hexdigest()
        existing_record = db.scalar(
            select(ImportRecord).where(
                ImportRecord.user_id == user_id,
                ImportRecord.source_type == SourceType.ACCOUNT_AGGREGATOR,
                ImportRecord.document_hash == doc_hash,
            )
        )

        if existing_record is None:
            sync_record = ImportRecord(
                portfolio_id=portfolio.id,
                user_id=user_id,
                source_type=SourceType.ACCOUNT_AGGREGATOR,
                file_name=f"AA_Sync_{request_id[:8]}",
                document_hash=doc_hash,
                status=ImportStatus.COMPLETED,
                completed_at=now,
            )
            db.add(sync_record)
        else:
            existing_record.status = ImportStatus.COMPLETED
            existing_record.completed_at = now

        db.commit()
        db.refresh(portfolio)

        logger.info(
            "OTP Sync ingested %d holdings (total ₹%s) for user=%s into portfolio=%s",
            holdings_created,
            total_value,
            user_id,
            portfolio.id,
        )

        return portfolio, holdings_created, total_value

    async def verify_otp(
        self,
        db: Session,
        user_id: str,
        request_id: str,
        otp: str,
    ) -> NsdlOtpVerifyResult:
        """
        Verify an OTP belonging to the authenticated user and ingest holdings.
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

        expires_at = session.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at <= now:
            session.status = "expired"
            db.commit()
            raise CasOtpServiceError("OTP session has expired. Please request a new one.")

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
        except Exception as exc:
            db.commit()
            raise CasOtpServiceError(str(exc)) from exc

        if result.status.lower() in {"verified", "success", "completed"}:
            session.status = "verified"
            # Ingest portfolio data
            if result.cas_data:
                port, count, total_val = self._ingest_portfolio_data(
                    db=db,
                    user_id=user_id,
                    request_id=request_id,
                    cas_data=result.cas_data,
                )
                result.portfolio_id = str(port.id)
                result.holdings_count = count
                result.total_value = float(total_val)
        else:
            if session.attempts >= MAX_OTP_ATTEMPTS:
                session.status = "failed"

        db.commit()
        return result