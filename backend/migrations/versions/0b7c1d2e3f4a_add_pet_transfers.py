"""add pet transfers

Revision ID: 0b7c1d2e3f4a
Revises: f4c8a2b6d9e1
Create Date: 2026-09-05 18:30:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0b7c1d2e3f4a"
down_revision: str | None = "f4c8a2b6d9e1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pet_transfers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("pet_id", sa.Uuid(), nullable=False),
        sa.Column("from_user_id", sa.Uuid(), nullable=False),
        sa.Column("to_user_id", sa.Uuid(), nullable=True),
        sa.Column("token", sa.String(length=96), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["from_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["pet_id"], ["pets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["to_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token", name="uq_pet_transfers_token"),
    )
    op.create_index(op.f("ix_pet_transfers_from_user_id"), "pet_transfers", ["from_user_id"], unique=False)
    op.create_index(op.f("ix_pet_transfers_pet_id"), "pet_transfers", ["pet_id"], unique=False)
    op.create_index(op.f("ix_pet_transfers_to_user_id"), "pet_transfers", ["to_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_pet_transfers_to_user_id"), table_name="pet_transfers")
    op.drop_index(op.f("ix_pet_transfers_pet_id"), table_name="pet_transfers")
    op.drop_index(op.f("ix_pet_transfers_from_user_id"), table_name="pet_transfers")
    op.drop_table("pet_transfers")
