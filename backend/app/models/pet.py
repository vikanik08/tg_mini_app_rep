import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.enums import PetSex, PetSpecies


class Pet(Base):
    __tablename__ = "pets"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    name: Mapped[str] = mapped_column(String(128), nullable=False)

    species: Mapped[PetSpecies] = mapped_column(
        Enum(
            PetSpecies,
            name="pet_species",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
    )

    sex: Mapped[PetSex] = mapped_column(
        Enum(
            PetSex,
            name="pet_sex",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        default=PetSex.UNKNOWN,
        nullable=False,
    )

    birthdate: Mapped[date | None] = mapped_column(Date, nullable=True)
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    species_label: Mapped[str | None] = mapped_column(String(128), nullable=True)
    breed: Mapped[str | None] = mapped_column(String(128), nullable=True)
    color: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_neutered: Mapped[bool] = mapped_column(default=False, nullable=False)
    is_vaccinated: Mapped[bool] = mapped_column(default=False, nullable=False)
    vaccination_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    has_parasite_treatment: Mapped[bool] = mapped_column(default=False, nullable=False)
    flea_treatment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    worm_treatment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    flea_treatment_product: Mapped[str | None] = mapped_column(String(128), nullable=True)
    worm_treatment_product: Mapped[str | None] = mapped_column(String(128), nullable=True)
    has_chronic_conditions: Mapped[bool] = mapped_column(default=False, nullable=False)
    chronic_conditions_notes: Mapped[str | None] = mapped_column(String(512), nullable=True)
    had_surgeries: Mapped[bool] = mapped_column(default=False, nullable=False)
    surgeries_notes: Mapped[str | None] = mapped_column(String(512), nullable=True)
    has_microchip: Mapped[bool] = mapped_column(default=False, nullable=False)
    microchip_number: Mapped[str | None] = mapped_column(String(128), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user = relationship("User", backref="pets")
