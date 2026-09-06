"""Add quantity and market_value to scheme_holdings

Revision ID: 20260905_0004
Revises: 74e9a136a3b6
Create Date: 2026-09-05 08:55:00
"""
import sqlalchemy as sa
from alembic import op

revision = "20260905_0004"
down_revision = "74e9a136a3b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "scheme_holdings",
        sa.Column("quantity", sa.Numeric(18, 4), nullable=True),
    )
    op.add_column(
        "scheme_holdings",
        sa.Column("market_value", sa.Numeric(18, 4), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("scheme_holdings", "market_value")
    op.drop_column("scheme_holdings", "quantity")
