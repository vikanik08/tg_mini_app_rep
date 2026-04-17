import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.enums import PetSex, PetSpecies


class PetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    species: PetSpecies
    sex: PetSex = PetSex.UNKNOWN
    birthdate: date | None = None
    weight_kg: Decimal | None = Field(default=None, ge=0, le=200)
    photo_url: str | None = Field(default=None, max_length=2_000_000)
    species_label: str | None = Field(default=None, max_length=128)
    breed: str | None = Field(default=None, max_length=128)
    color: str | None = Field(default=None, max_length=128)
    is_neutered: bool = False
    is_vaccinated: bool = False
    vaccination_date: date | None = None
    has_parasite_treatment: bool = False
    flea_treatment_date: date | None = None
    worm_treatment_date: date | None = None
    flea_treatment_product: str | None = Field(default=None, max_length=128)
    worm_treatment_product: str | None = Field(default=None, max_length=128)
    has_chronic_conditions: bool = False
    chronic_conditions_notes: str | None = Field(default=None, max_length=512)
    had_surgeries: bool = False
    surgeries_notes: str | None = Field(default=None, max_length=512)
    has_microchip: bool = False
    microchip_number: str | None = Field(default=None, max_length=128)


class PetCreate(PetBase):
    pass


class PetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    species: PetSpecies | None = None
    sex: PetSex | None = None
    birthdate: date | None = None
    weight_kg: Decimal | None = Field(default=None, ge=0, le=200)
    photo_url: str | None = Field(default=None, max_length=2_000_000)
    species_label: str | None = Field(default=None, max_length=128)
    breed: str | None = Field(default=None, max_length=128)
    color: str | None = Field(default=None, max_length=128)
    is_neutered: bool | None = None
    is_vaccinated: bool | None = None
    vaccination_date: date | None = None
    has_parasite_treatment: bool | None = None
    flea_treatment_date: date | None = None
    worm_treatment_date: date | None = None
    flea_treatment_product: str | None = Field(default=None, max_length=128)
    worm_treatment_product: str | None = Field(default=None, max_length=128)
    has_chronic_conditions: bool | None = None
    chronic_conditions_notes: str | None = Field(default=None, max_length=512)
    had_surgeries: bool | None = None
    surgeries_notes: str | None = Field(default=None, max_length=512)
    has_microchip: bool | None = None
    microchip_number: str | None = Field(default=None, max_length=128)


class PetResponse(PetBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
