"""add pet operation and vaccination details

Revision ID: 2d3e4f5a6b7c
Revises: 1c2d3e4f5a6b
Create Date: 2026-10-07 12:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "2d3e4f5a6b7c"
down_revision: str | None = "1c2d3e4f5a6b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "pets",
        sa.Column(
            "reproductive_status",
            sa.String(length=24),
            server_default="none",
            nullable=False,
        ),
    )
    op.add_column(
        "pets",
        sa.Column("vaccination_type", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "pets",
        sa.Column("vaccination_product", sa.String(length=128), nullable=True),
    )

    op.execute(
        """
        UPDATE pets
        SET reproductive_status = CASE
            WHEN is_neutered IS TRUE AND sex = 'female' THEN 'sterilization'
            WHEN is_neutered IS TRUE THEN 'castration'
            ELSE 'none'
        END
        """
    )


def downgrade() -> None:
    op.drop_column("pets", "vaccination_product")
    op.drop_column("pets", "vaccination_type")
    op.drop_column("pets", "reproductive_status")
