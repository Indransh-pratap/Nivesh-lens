"""add CAS idempotency metadata

Revision ID: 20260819_0002
Revises: 20260815_0001
Create Date: 2026-08-19 00:00:00
"""
import sqlalchemy as sa
from alembic import op

revision = "20260819_0002"
down_revision = "20260815_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("import_records", sa.Column("user_id", sa.String(255), nullable=True))
    op.add_column("import_records", sa.Column("document_hash", sa.String(64), nullable=True))
    op.add_column("import_records", sa.Column("statement_period", sa.Date(), nullable=True))
    op.add_column("import_records", sa.Column("error_code", sa.String(64), nullable=True))
    # Existing Phase-0 rows did not represent CAS documents. These defaults make the migration safe before enforcing integrity.
    op.execute("UPDATE import_records SET user_id = 'legacy', document_hash = id::text WHERE user_id IS NULL OR document_hash IS NULL")
    op.alter_column("import_records", "user_id", nullable=False)
    op.alter_column("import_records", "document_hash", nullable=False)
    op.create_index("ix_import_records_user_id", "import_records", ["user_id"])
    op.create_unique_constraint("uq_import_records_user_source_hash", "import_records", ["user_id", "source_type", "document_hash"])


def downgrade() -> None:
    op.drop_constraint("uq_import_records_user_source_hash", "import_records", type_="unique")
    op.drop_index("ix_import_records_user_id", table_name="import_records")
    op.drop_column("import_records", "error_code")
    op.drop_column("import_records", "statement_period")
    op.drop_column("import_records", "document_hash")
    op.drop_column("import_records", "user_id")
