"""add pet species label

Revision ID: d2e4a1f8b9c0
Revises: c7b9d5a3f6e2
Create Date: 2026-04-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d2e4a1f8b9c0"
down_revision: Union[str, Sequence[str], None] = "c7b9d5a3f6e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("pets", sa.Column("species_label", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("pets", "species_label")
