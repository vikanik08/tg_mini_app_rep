"""add promos and user activity

Revision ID: e3b7a9d1c4f2
Revises: b6c7d8e9f0a1
Create Date: 2026-09-03 12:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "e3b7a9d1c4f2"
down_revision: str | None = "b6c7d8e9f0a1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "users",
        sa.Column("last_inactive_message_sent_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "promo_redemptions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("plan", sa.String(length=32), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "code", name="uq_promo_redemptions_user_code"),
    )
    op.create_index(op.f("ix_promo_redemptions_user_id"), "promo_redemptions", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_promo_redemptions_user_id"), table_name="promo_redemptions")
    op.drop_table("promo_redemptions")
    op.drop_column("users", "last_inactive_message_sent_at")
    op.drop_column("users", "last_seen_at")
