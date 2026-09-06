import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class FundScheme(Base):
    __tablename__ = "fund_schemes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scheme_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    scheme_name: Mapped[str] = mapped_column(String(255), nullable=False)
    isin: Mapped[str | None] = mapped_column(String(12), index=True)
    amc_name: Mapped[str | None] = mapped_column(String(255))
    category: Mapped[str | None] = mapped_column(String(100))
    expense_ratio: Mapped[Decimal] = mapped_column(Numeric(6, 4), nullable=False, default=Decimal("0"))
    benchmark_id: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    nav_history: Mapped[list["FundNAVHistory"]] = relationship(back_populates="scheme", cascade="all, delete-orphan")
    holdings: Mapped[list["SchemeHolding"]] = relationship(back_populates="scheme", cascade="all, delete-orphan")


class FundNAVHistory(Base):
    __tablename__ = "fund_nav_history"
    __table_args__ = (UniqueConstraint("scheme_id", "nav_date", name="uq_fund_nav_history_scheme_date"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scheme_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("fund_schemes.id", ondelete="CASCADE"), nullable=False, index=True)
    nav_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    nav: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)

    scheme: Mapped["FundScheme"] = relationship(back_populates="nav_history")


class Benchmark(Base):
    __tablename__ = "benchmarks"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    index_symbol: Mapped[str] = mapped_column(String(50), nullable=False)

    prices: Mapped[list["BenchmarkPrice"]] = relationship(back_populates="benchmark", cascade="all, delete-orphan")


class BenchmarkPrice(Base):
    __tablename__ = "benchmark_prices"
    __table_args__ = (UniqueConstraint("benchmark_id", "price_date", name="uq_benchmark_prices_benchmark_date"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    benchmark_id: Mapped[str] = mapped_column(String(50), ForeignKey("benchmarks.id", ondelete="CASCADE"), nullable=False, index=True)
    price_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    value: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)

    benchmark: Mapped["Benchmark"] = relationship(back_populates="prices")


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    isin: Mapped[str | None] = mapped_column(String(12), unique=True, index=True)
    ticker: Mapped[str | None] = mapped_column(String(50), index=True)
    sector: Mapped[str | None] = mapped_column(String(100))

    group_membership: Mapped["CompanyGroupMembership | None"] = relationship(back_populates="company", uselist=False, cascade="all, delete-orphan")


class CompanyGroup(Base):
    __tablename__ = "company_groups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)

    memberships: Mapped[list["CompanyGroupMembership"]] = relationship(back_populates="group", cascade="all, delete-orphan")


class CompanyGroupMembership(Base):
    __tablename__ = "company_group_memberships"
    __table_args__ = (UniqueConstraint("company_id", "group_id", name="uq_company_group_membership"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, unique=True)
    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company_groups.id", ondelete="CASCADE"), nullable=False, index=True)

    company: Mapped["Company"] = relationship(back_populates="group_membership")
    group: Mapped["CompanyGroup"] = relationship(back_populates="memberships")


class SchemeHolding(Base):
    __tablename__ = "scheme_holdings"
    __table_args__ = (UniqueConstraint("scheme_id", "as_of_date", "company_name", name="uq_scheme_holdings_scheme_date_company"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scheme_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("fund_schemes.id", ondelete="CASCADE"), nullable=False, index=True)
    as_of_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    company_isin: Mapped[str | None] = mapped_column(String(12), index=True)
    sector: Mapped[str | None] = mapped_column(String(100))
    weight_percentage: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False)
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    market_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)

    scheme: Mapped["FundScheme"] = relationship(back_populates="holdings")


class DataSyncRecord(Base):
    __tablename__ = "data_sync_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    as_of_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="SUCCESS")
    checksum: Mapped[str | None] = mapped_column(String(64))
    details: Mapped[str | None] = mapped_column(Text)
