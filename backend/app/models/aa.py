"""Persisted, user-scoped Account Aggregator state; bank data never uses investment tables."""
import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base

class AAConsent(Base):
    __tablename__ = "aa_consents"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    consent_id: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING")
    environment: Mapped[str] = mapped_column(String(16), nullable=False, default="UNKNOWN")
    data_from: Mapped[str | None] = mapped_column(String(64)); data_to: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class AASync(Base):
    __tablename__ = "aa_syncs"; __table_args__ = (UniqueConstraint("session_id", name="uq_aa_syncs_session_id"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    consent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aa_consents.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True); status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING")
    error_code: Mapped[str | None] = mapped_column(String(64)); error_message: Mapped[str | None] = mapped_column(String(512)); completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class BankAccount(Base):
    __tablename__ = "bank_accounts"; __table_args__ = (UniqueConstraint("user_id", "link_ref_number", name="uq_bank_accounts_user_link"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4); user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    consent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aa_consents.id", ondelete="CASCADE"), nullable=False, index=True); link_ref_number: Mapped[str] = mapped_column(String(160), nullable=False)
    masked_account_number: Mapped[str | None] = mapped_column(String(64)); bank_name: Mapped[str | None] = mapped_column(String(160)); account_type: Mapped[str | None] = mapped_column(String(64)); currency: Mapped[str | None] = mapped_column(String(8))
    current_balance: Mapped[Decimal | None] = mapped_column(Numeric(18,2)); balance_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True)); last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False); updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class BankTransaction(Base):
    __tablename__ = "bank_transactions"; __table_args__ = (UniqueConstraint("bank_account_id", "external_id", name="uq_bank_transactions_account_external"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4); user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    bank_account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bank_accounts.id", ondelete="CASCADE"), nullable=False, index=True); external_id: Mapped[str] = mapped_column(String(255), nullable=False)
    transaction_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True); description: Mapped[str | None] = mapped_column(Text); amount: Mapped[Decimal] = mapped_column(Numeric(18,2), nullable=False)
    currency: Mapped[str | None] = mapped_column(String(8)); transaction_type: Mapped[str | None] = mapped_column(String(32)); status: Mapped[str | None] = mapped_column(String(64)); available_balance: Mapped[Decimal | None] = mapped_column(Numeric(18,2)); created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class AAWebhookDelivery(Base):
    __tablename__ = "aa_webhook_deliveries"; notification_id: Mapped[str] = mapped_column(String(128), primary_key=True); received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
