"""record Account Aggregator environment provenance

Revision ID: 20261011_0006
Revises: 20261011_0005
"""
import sqlalchemy as sa
from alembic import op

revision = "20261011_0006"
down_revision = "20261011_0005"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("aa_consents", sa.Column("environment", sa.String(16), nullable=False, server_default="UNKNOWN"))

def downgrade() -> None:
    op.drop_column("aa_consents", "environment")
