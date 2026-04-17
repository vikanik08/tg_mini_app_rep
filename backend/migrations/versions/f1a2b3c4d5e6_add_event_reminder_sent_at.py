"""add event reminder sent at

Revision ID: f1a2b3c4d5e6
Revises: d2e4a1f8b9c0
Create Date: 2026-04-17 15:40:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "f1a2b3c4d5e6"
down_revision: str | None = "d2e4a1f8b9c0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column("reminder_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_events_reminder_sent_at"),
        "events",
        ["reminder_sent_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_events_reminder_sent_at"), table_name="events")
    op.drop_column("events", "reminder_sent_at")
