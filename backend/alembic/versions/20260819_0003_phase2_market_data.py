"""Phase 2 market data schema

Revision ID: 20260819_0003
Revises: 20260819_0002
Create Date: 2026-08-19 00:00:00
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260819_0003"
down_revision = "20260819_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # fund_schemes
    op.create_table(
        "fund_schemes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("scheme_code", sa.String(50), nullable=False, unique=True),
        sa.Column("scheme_name", sa.String(255), nullable=False),
        sa.Column("isin", sa.String(12)),
        sa.Column("amc_name", sa.String(255)),
        sa.Column("category", sa.String(100)),
        sa.Column("expense_ratio", sa.Numeric(6, 4), nullable=False, server_default="0"),
        sa.Column("benchmark_id", sa.String(50)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_fund_schemes_scheme_code", "fund_schemes", ["scheme_code"])
    op.create_index("ix_fund_schemes_isin", "fund_schemes", ["isin"])

    # fund_nav_history
    op.create_table(
        "fund_nav_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("scheme_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("fund_schemes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nav_date", sa.Date(), nullable=False),
        sa.Column("nav", sa.Numeric(18, 4), nullable=False),
    )
    op.create_index("ix_fund_nav_history_scheme_id", "fund_nav_history", ["scheme_id"])
    op.create_index("ix_fund_nav_history_nav_date", "fund_nav_history", ["nav_date"])
    op.create_unique_constraint("uq_fund_nav_history_scheme_date", "fund_nav_history", ["scheme_id", "nav_date"])

    # benchmarks
    op.create_table(
        "benchmarks",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("index_symbol", sa.String(50), nullable=False),
    )

    # benchmark_prices
    op.create_table(
        "benchmark_prices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("benchmark_id", sa.String(50), sa.ForeignKey("benchmarks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("price_date", sa.Date(), nullable=False),
        sa.Column("value", sa.Numeric(18, 4), nullable=False),
    )
    op.create_index("ix_benchmark_prices_benchmark_id", "benchmark_prices", ["benchmark_id"])
    op.create_index("ix_benchmark_prices_price_date", "benchmark_prices", ["price_date"])
    op.create_unique_constraint("uq_benchmark_prices_benchmark_date", "benchmark_prices", ["benchmark_id", "price_date"])

    # companies
    op.create_table(
        "companies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("isin", sa.String(12), unique=True),
        sa.Column("ticker", sa.String(50)),
        sa.Column("sector", sa.String(100)),
    )
    op.create_index("ix_companies_name", "companies", ["name"])
    op.create_index("ix_companies_isin", "companies", ["isin"])
    op.create_index("ix_companies_ticker", "companies", ["ticker"])

    # company_groups
    op.create_table(
        "company_groups",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("description", sa.Text()),
    )
    op.create_index("ix_company_groups_name", "company_groups", ["name"])

    # company_group_memberships
    op.create_table(
        "company_group_memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("company_groups.id", ondelete="CASCADE"), nullable=False),
    )
    op.create_index("ix_company_group_memberships_group_id", "company_group_memberships", ["group_id"])
    op.create_unique_constraint("uq_company_group_membership", "company_group_memberships", ["company_id", "group_id"])

    # scheme_holdings
    op.create_table(
        "scheme_holdings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("scheme_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("fund_schemes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("as_of_date", sa.Date(), nullable=False),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column("company_isin", sa.String(12)),
        sa.Column("sector", sa.String(100)),
        sa.Column("weight_percentage", sa.Numeric(8, 4), nullable=False),
    )
    op.create_index("ix_scheme_holdings_scheme_id", "scheme_holdings", ["scheme_id"])
    op.create_index("ix_scheme_holdings_as_of_date", "scheme_holdings", ["as_of_date"])
    op.create_index("ix_scheme_holdings_company_isin", "scheme_holdings", ["company_isin"])
    op.create_unique_constraint("uq_scheme_holdings_scheme_date_company", "scheme_holdings", ["scheme_id", "as_of_date", "company_name"])

    # data_sync_records
    op.create_table(
        "data_sync_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source", sa.String(100), nullable=False),
        sa.Column("provider", sa.String(100), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("as_of_date", sa.Date()),
        sa.Column("status", sa.String(50), nullable=False, server_default="SUCCESS"),
        sa.Column("checksum", sa.String(64)),
        sa.Column("details", sa.Text()),
    )
    op.create_index("ix_data_sync_records_source", "data_sync_records", ["source"])


def downgrade() -> None:
    op.drop_table("data_sync_records")
    op.drop_table("scheme_holdings")
    op.drop_table("company_group_memberships")
    op.drop_table("company_groups")
    op.drop_table("companies")
    op.drop_table("benchmark_prices")
    op.drop_table("benchmarks")
    op.drop_table("fund_nav_history")
    op.drop_table("fund_schemes")
