"""add account copies

Revision ID: 1c2d3e4f5a6b
Revises: aa1b2c3d4e5f
Create Date: 2026-10-01 12:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "1c2d3e4f5a6b"
down_revision: str | None = "aa1b2c3d4e5f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "account_copies",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("from_user_id", sa.Uuid(), nullable=False),
        sa.Column("to_user_id", sa.Uuid(), nullable=True),
        sa.Column("token", sa.String(length=96), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("copied_pets", sa.Integer(), nullable=False),
        sa.Column("copied_events", sa.Integer(), nullable=False),
        sa.Column("copied_health_checks", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["from_user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["to_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token", name="uq_account_copies_token"),
    )
    op.create_index(
        op.f("ix_account_copies_from_user_id"),
        "account_copies",
        ["from_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_account_copies_to_user_id"),
        "account_copies",
        ["to_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_account_copies_to_user_id"), table_name="account_copies")
    op.drop_index(op.f("ix_account_copies_from_user_id"), table_name="account_copies")
    op.drop_table("account_copies")
