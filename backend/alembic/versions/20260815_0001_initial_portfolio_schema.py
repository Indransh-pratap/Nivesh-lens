"""initial portfolio schema

Revision ID: 20260815_0001
Revises:
Create Date: 2026-08-15 00:00:00
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260815_0001"
down_revision = None
branch_labels = None
depends_on = None

asset_type = sa.Enum("STOCK", "MUTUAL_FUND", "FD", "EPF", "OTHER", name="asset_type")
transaction_type = sa.Enum("BUY", "SELL", "DIVIDEND", "INTEREST", "OTHER", name="transaction_type")
source_type = sa.Enum("CAS", "ACCOUNT_AGGREGATOR", "MANUAL", "OTHER", name="source_type")
import_status = sa.Enum("PENDING", "PROCESSING", "COMPLETED", "FAILED", name="import_status")


def upgrade() -> None:
    op.create_table("portfolios", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("user_id", sa.String(255), nullable=False), sa.Column("name", sa.String(120), nullable=False), sa.Column("total_value", sa.Numeric(18, 2), nullable=False, server_default="0"), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")), sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    op.create_index("ix_portfolios_user_id", "portfolios", ["user_id"])
    op.create_table("holdings", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("portfolio_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False), sa.Column("asset_type", asset_type, nullable=False), sa.Column("symbol", sa.String(50)), sa.Column("name", sa.String(255), nullable=False), sa.Column("isin", sa.String(12)), sa.Column("quantity", sa.Numeric(18, 6), nullable=False, server_default="0"), sa.Column("average_price", sa.Numeric(18, 2), nullable=False, server_default="0"), sa.Column("current_price", sa.Numeric(18, 2), nullable=False, server_default="0"), sa.Column("invested_value", sa.Numeric(18, 2), nullable=False, server_default="0"), sa.Column("current_value", sa.Numeric(18, 2), nullable=False, server_default="0"), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")), sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    op.create_index("ix_holdings_portfolio_id", "holdings", ["portfolio_id"])
    op.create_table("transactions", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("portfolio_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False), sa.Column("holding_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("holdings.id", ondelete="SET NULL")), sa.Column("transaction_type", transaction_type, nullable=False), sa.Column("transaction_date", sa.Date(), nullable=False), sa.Column("quantity", sa.Numeric(18, 6), nullable=False, server_default="0"), sa.Column("price", sa.Numeric(18, 2), nullable=False, server_default="0"), sa.Column("amount", sa.Numeric(18, 2), nullable=False, server_default="0"), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    op.create_index("ix_transactions_portfolio_id", "transactions", ["portfolio_id"])
    op.create_index("ix_transactions_holding_id", "transactions", ["holding_id"])
    op.create_table("import_records", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("portfolio_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False), sa.Column("source_type", source_type, nullable=False), sa.Column("file_name", sa.String(255)), sa.Column("status", import_status, nullable=False, server_default="PENDING"), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")), sa.Column("completed_at", sa.DateTime(timezone=True)), sa.Column("error_message", sa.Text()))
    op.create_index("ix_import_records_portfolio_id", "import_records", ["portfolio_id"])


def downgrade() -> None:
    op.drop_table("import_records")
    op.drop_table("transactions")
    op.drop_table("holdings")
    op.drop_table("portfolios")
    import_status.drop(op.get_bind(), checkfirst=True)
    source_type.drop(op.get_bind(), checkfirst=True)
    transaction_type.drop(op.get_bind(), checkfirst=True)
    asset_type.drop(op.get_bind(), checkfirst=True)
