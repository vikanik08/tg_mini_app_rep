"""default user timezone moscow

Revision ID: aa1b2c3d4e5f
Revises: 6c8d2e4f1a9b
Create Date: 2026-09-13 12:00:00.000000

"""
from collections.abc import Sequence

from alembic import op


revision: str = "aa1b2c3d4e5f"
down_revision: str | None = "6c8d2e4f1a9b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ALTER COLUMN timezone SET DEFAULT 'Europe/Moscow'")
    op.execute("UPDATE users SET timezone = 'Europe/Moscow' WHERE timezone = 'UTC'")


def downgrade() -> None:
    op.execute("ALTER TABLE users ALTER COLUMN timezone SET DEFAULT 'UTC'")
    op.execute("UPDATE users SET timezone = 'UTC' WHERE timezone = 'Europe/Moscow'")
