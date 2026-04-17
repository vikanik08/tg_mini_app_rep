"""allow large pet photos

Revision ID: c7b9d5a3f6e2
Revises: a8f2f9d70f1a
Create Date: 2026-04-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7b9d5a3f6e2"
down_revision: Union[str, Sequence[str], None] = "a8f2f9d70f1a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("pets") as batch_op:
        batch_op.alter_column(
            "photo_url",
            existing_type=sa.String(length=512),
            type_=sa.Text(),
            existing_nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("pets") as batch_op:
        batch_op.alter_column(
            "photo_url",
            existing_type=sa.Text(),
            type_=sa.String(length=512),
            existing_nullable=True,
        )
