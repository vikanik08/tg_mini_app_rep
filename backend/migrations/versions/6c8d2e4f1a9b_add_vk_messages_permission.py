"""add vk messages permission

Revision ID: 6c8d2e4f1a9b
Revises: 0b7c1d2e3f4a
Create Date: 2026-09-05 19:20:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "6c8d2e4f1a9b"
down_revision: str | None = "0b7c1d2e3f4a"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("vk_messages_allowed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "vk_messages_allowed_at")
