import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class AssetType(str, enum.Enum):
    STOCK = "STOCK"
    MUTUAL_FUND = "MUTUAL_FUND"
    FD = "FD"
    EPF = "EPF"
    OTHER = "OTHER"


class Holding(Base):
    __tablename__ = "holdings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portfolio_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_type: Mapped[AssetType] = mapped_column(Enum(AssetType, name="asset_type"), nullable=False)
    symbol: Mapped[str | None] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    isin: Mapped[str | None] = mapped_column(String(12))
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False, default=Decimal("0"))
    average_price: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0"))
    current_price: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0"))
    invested_value: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0"))
    current_value: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    portfolio: Mapped["Portfolio"] = relationship(back_populates="holdings")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="holding")
