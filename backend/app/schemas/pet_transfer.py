import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.models.enums import PetSpecies


PetTransferStatus = Literal["pending", "accepted", "cancelled", "expired"]


class PetTransferResponse(BaseModel):
    token: str
    status: PetTransferStatus
    pet_id: uuid.UUID
    pet_name: str
    pet_species: PetSpecies
    from_user_name: str | None
    expires_at: datetime
    created_at: datetime
    accepted_at: datetime | None = None
    cancelled_at: datetime | None = None
