"""add cas otp sessions

Revision ID: 74e9a136a3b6
Revises: 20260819_0003
Create Date: 2026-08-26
"""

from alembic import op
import sqlalchemy as sa


revision = "74e9a136a3b6"
down_revision = "20260819_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cas_otp_sessions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.String(length=255), nullable=False),
        sa.Column("request_id", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_cas_otp_sessions_expires_at",
        "cas_otp_sessions",
        ["expires_at"],
        unique=False,
    )

    op.create_index(
        "ix_cas_otp_sessions_request_id",
        "cas_otp_sessions",
        ["request_id"],
        unique=True,
    )

    op.create_index(
        "ix_cas_otp_sessions_status",
        "cas_otp_sessions",
        ["status"],
        unique=False,
    )

    op.create_index(
        "ix_cas_otp_sessions_user_id",
        "cas_otp_sessions",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_cas_otp_sessions_user_id",
        table_name="cas_otp_sessions",
    )

    op.drop_index(
        "ix_cas_otp_sessions_status",
        table_name="cas_otp_sessions",
    )

    op.drop_index(
        "ix_cas_otp_sessions_request_id",
        table_name="cas_otp_sessions",
    )

    op.drop_index(
        "ix_cas_otp_sessions_expires_at",
        table_name="cas_otp_sessions",
    )

    op.drop_table("cas_otp_sessions")