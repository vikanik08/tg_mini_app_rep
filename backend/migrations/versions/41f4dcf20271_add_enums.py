"""add enums

Revision ID: 41f4dcf20271
Revises: 3705d80f57e9
Create Date: 2026-04-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "41f4dcf20271"
down_revision: Union[str, Sequence[str], None] = "3705d80f57e9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


pet_species_enum = postgresql.ENUM("cat", "dog", "other", name="pet_species")
pet_sex_enum = postgresql.ENUM("male", "female", "unknown", name="pet_sex")
event_type_enum = postgresql.ENUM(
    "vaccine",
    "flea_treatment",
    "vet_visit",
    "grooming",
    "other",
    name="event_type",
)


def upgrade() -> None:
    # 1. создаём enum types в postgres
    pet_species_enum.create(op.get_bind(), checkfirst=True)
    pet_sex_enum.create(op.get_bind(), checkfirst=True)
    event_type_enum.create(op.get_bind(), checkfirst=True)

    # 2. меняем типы колонок через USING
    op.execute(
        """
        ALTER TABLE pets
        ALTER COLUMN species TYPE pet_species
        USING species::pet_species
        """
    )

    op.execute(
        """
        ALTER TABLE pets
        ALTER COLUMN sex TYPE pet_sex
        USING sex::pet_sex
        """
    )

    op.execute(
        """
        ALTER TABLE events
        ALTER COLUMN type TYPE event_type
        USING type::event_type
        """
    )


def downgrade() -> None:
    # возвращаем обратно в VARCHAR
    op.execute(
        """
        ALTER TABLE events
        ALTER COLUMN type TYPE VARCHAR(32)
        USING type::text
        """
    )

    op.execute(
        """
        ALTER TABLE pets
        ALTER COLUMN sex TYPE VARCHAR(16)
        USING sex::text
        """
    )

    op.execute(
        """
        ALTER TABLE pets
        ALTER COLUMN species TYPE VARCHAR(32)
        USING species::text
        """
    )

    # удаляем enum types
    event_type_enum.drop(op.get_bind(), checkfirst=True)
    pet_sex_enum.drop(op.get_bind(), checkfirst=True)
    pet_species_enum.drop(op.get_bind(), checkfirst=True)