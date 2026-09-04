import enum
import uuid
from decimal import Decimal

from sqlalchemy import Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class AssetType(str, enum.Enum):
    STOCK = "STOCK"
    MUTUAL_FUND = "MUTUAL_FUND"
    ETF = "ETF"
    BOND = "BOND"
    CASH = "CASH"
    OTHER = "OTHER"


class Holding(Base):
    __tablename__ = "holdings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "portfolios.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    asset_type: Mapped[AssetType] = mapped_column(
        Enum(
            AssetType,
            name="asset_type",
        ),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    isin: Mapped[str | None] = mapped_column(
        String(12),
        nullable=True,
        index=True,
    )

    quantity: Mapped[Decimal] = mapped_column(
        Numeric(24, 8),
        nullable=False,
        default=Decimal("0"),
    )

    average_price: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        nullable=False,
        default=Decimal("0"),
    )

    current_price: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        nullable=False,
        default=Decimal("0"),
    )

    invested_value: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0"),
    )

    current_value: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0"),
    )

    portfolio = relationship(
        "Portfolio",
        back_populates="holdings",
    )

    transactions = relationship(
        "Transaction",
        back_populates="holding",
        cascade="all, delete-orphan",
    )