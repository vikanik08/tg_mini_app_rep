"""add subscription expiry notice key

Revision ID: f4c8a2b6d9e1
Revises: e3b7a9d1c4f2
Create Date: 2026-09-03 16:30:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "f4c8a2b6d9e1"
down_revision: str | None = "e3b7a9d1c4f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("last_subscription_expiry_notice_key", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "last_subscription_expiry_notice_key")
