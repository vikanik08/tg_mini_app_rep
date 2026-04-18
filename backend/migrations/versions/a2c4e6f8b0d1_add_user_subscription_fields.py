"""add user subscription fields

Revision ID: a2c4e6f8b0d1
Revises: f1a2b3c4d5e6
Create Date: 2026-04-18 10:20:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "a2c4e6f8b0d1"
down_revision: str | None = "f1a2b3c4d5e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("subscription_plan", sa.String(length=32), nullable=False, server_default="basic"),
    )
    op.add_column(
        "users",
        sa.Column("subscription_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.alter_column("users", "subscription_plan", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "subscription_expires_at")
    op.drop_column("users", "subscription_plan")
