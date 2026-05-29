"""add user platform identity

Revision ID: b6c7d8e9f0a1
Revises: f1a2b3c4d5e6
Create Date: 2026-05-09 18:20:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "b6c7d8e9f0a1"
down_revision: str | None = "a2c4e6f8b0d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("platform", sa.String(length=16), nullable=True, server_default="telegram"),
    )
    op.add_column(
        "users",
        sa.Column("platform_user_id", sa.String(length=128), nullable=True),
    )
    op.create_index(
        op.f("ix_users_platform_user_id"),
        "users",
        ["platform_user_id"],
        unique=False,
    )

    op.execute("UPDATE users SET platform = 'telegram' WHERE platform IS NULL")
    op.execute(
        "UPDATE users SET platform_user_id = CAST(telegram_id AS TEXT) WHERE platform_user_id IS NULL"
    )

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("platform", existing_type=sa.String(length=16), nullable=False)
        batch_op.alter_column(
            "platform_user_id",
            existing_type=sa.String(length=128),
            nullable=False,
        )
        batch_op.alter_column(
            "telegram_id",
            existing_type=sa.BigInteger(),
            nullable=True,
        )
        batch_op.create_unique_constraint(
            "uq_users_platform_user_id",
            ["platform", "platform_user_id"],
        )

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("platform", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("uq_users_platform_user_id", type_="unique")
        batch_op.alter_column(
            "telegram_id",
            existing_type=sa.BigInteger(),
            nullable=False,
        )

    op.drop_index(op.f("ix_users_platform_user_id"), table_name="users")
    op.drop_column("users", "platform_user_id")
    op.drop_column("users", "platform")
