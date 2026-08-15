import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class SourceType(str, enum.Enum):
    CAS = "CAS"
    ACCOUNT_AGGREGATOR = "ACCOUNT_AGGREGATOR"
    MANUAL = "MANUAL"
    OTHER = "OTHER"


class ImportStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ImportRecord(Base):
    __tablename__ = "import_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portfolio_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False, index=True)
    source_type: Mapped[SourceType] = mapped_column(Enum(SourceType, name="source_type"), nullable=False)
    file_name: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[ImportStatus] = mapped_column(Enum(ImportStatus, name="import_status"), nullable=False, default=ImportStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text)

    portfolio: Mapped["Portfolio"] = relationship(back_populates="import_records")
