"""expand pet passport fields

Revision ID: 9e5ef7cbf31d
Revises: 41f4dcf20271
Create Date: 2026-04-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9e5ef7cbf31d"
down_revision: Union[str, Sequence[str], None] = "41f4dcf20271"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("pets", sa.Column("breed", sa.String(length=128), nullable=True))
    op.add_column("pets", sa.Column("color", sa.String(length=128), nullable=True))
    op.add_column(
        "pets",
        sa.Column("is_neutered", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "pets",
        sa.Column("is_vaccinated", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("pets", sa.Column("vaccination_date", sa.Date(), nullable=True))
    op.add_column(
        "pets",
        sa.Column(
            "has_parasite_treatment",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column("pets", sa.Column("flea_treatment_date", sa.Date(), nullable=True))
    op.add_column("pets", sa.Column("worm_treatment_date", sa.Date(), nullable=True))
    op.add_column(
        "pets",
        sa.Column("flea_treatment_product", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "pets",
        sa.Column("worm_treatment_product", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "pets",
        sa.Column(
            "has_chronic_conditions",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "pets",
        sa.Column("chronic_conditions_notes", sa.String(length=512), nullable=True),
    )
    op.add_column(
        "pets",
        sa.Column("had_surgeries", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("pets", sa.Column("surgeries_notes", sa.String(length=512), nullable=True))
    op.add_column(
        "pets",
        sa.Column("has_microchip", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("pets", sa.Column("microchip_number", sa.String(length=128), nullable=True))

    op.alter_column("pets", "is_neutered", server_default=None)
    op.alter_column("pets", "is_vaccinated", server_default=None)
    op.alter_column("pets", "has_parasite_treatment", server_default=None)
    op.alter_column("pets", "has_chronic_conditions", server_default=None)
    op.alter_column("pets", "had_surgeries", server_default=None)
    op.alter_column("pets", "has_microchip", server_default=None)


def downgrade() -> None:
    op.drop_column("pets", "microchip_number")
    op.drop_column("pets", "has_microchip")
    op.drop_column("pets", "surgeries_notes")
    op.drop_column("pets", "had_surgeries")
    op.drop_column("pets", "chronic_conditions_notes")
    op.drop_column("pets", "has_chronic_conditions")
    op.drop_column("pets", "worm_treatment_product")
    op.drop_column("pets", "flea_treatment_product")
    op.drop_column("pets", "worm_treatment_date")
    op.drop_column("pets", "flea_treatment_date")
    op.drop_column("pets", "has_parasite_treatment")
    op.drop_column("pets", "vaccination_date")
    op.drop_column("pets", "is_vaccinated")
    op.drop_column("pets", "is_neutered")
    op.drop_column("pets", "color")
    op.drop_column("pets", "breed")
