"""add health checks

Revision ID: a8f2f9d70f1a
Revises: 9e5ef7cbf31d
Create Date: 2026-04-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a8f2f9d70f1a"
down_revision: Union[str, Sequence[str], None] = "9e5ef7cbf31d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "health_checks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("pet_id", sa.Uuid(), nullable=False),
        sa.Column("weight_kg", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("appetite", sa.Integer(), nullable=True),
        sa.Column("water", sa.Integer(), nullable=True),
        sa.Column("urination_count", sa.Integer(), nullable=True),
        sa.Column("stool_count", sa.Integer(), nullable=True),
        sa.Column("stool_consistency", sa.Integer(), nullable=True),
        sa.Column("sleep_hours", sa.Numeric(precision=4, scale=1), nullable=True),
        sa.Column("activity", sa.Integer(), nullable=True),
        sa.Column("vomiting", sa.String(length=32), nullable=True),
        sa.Column("itching", sa.Integer(), nullable=True),
        sa.Column("sleep_breathing", sa.String(length=32), nullable=True),
        sa.Column("mood", sa.Integer(), nullable=True),
        sa.Column("pain", sa.String(length=32), nullable=True),
        sa.Column("cough", sa.String(length=32), nullable=True),
        sa.Column("discharge", sa.String(length=32), nullable=True),
        sa.Column("owner_note", sa.Text(), nullable=True),
        sa.Column("checked_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["pet_id"], ["pets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_health_checks_checked_at"), "health_checks", ["checked_at"], unique=False)
    op.create_index(op.f("ix_health_checks_pet_id"), "health_checks", ["pet_id"], unique=False)
    op.create_index(op.f("ix_health_checks_user_id"), "health_checks", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_health_checks_user_id"), table_name="health_checks")
    op.drop_index(op.f("ix_health_checks_pet_id"), table_name="health_checks")
    op.drop_index(op.f("ix_health_checks_checked_at"), table_name="health_checks")
    op.drop_table("health_checks")
