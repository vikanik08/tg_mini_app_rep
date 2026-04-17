import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class HealthCheckCreate(BaseModel):
    pet_id: uuid.UUID
    weight_kg: Decimal | None = Field(default=None, ge=0, le=999.99)
    appetite: int | None = Field(default=None, ge=1, le=4)
    water: int | None = Field(default=None, ge=1, le=5)
    urination_count: int | None = Field(default=None, ge=0, le=50)
    stool_count: int | None = Field(default=None, ge=0, le=50)
    stool_consistency: int | None = Field(default=None, ge=1, le=4)
    sleep_hours: Decimal | None = Field(default=None, ge=0, le=24)
    activity: int | None = Field(default=None, ge=1, le=5)
    vomiting: str | None = Field(default=None, max_length=32)
    itching: int | None = Field(default=None, ge=0, le=4)
    sleep_breathing: str | None = Field(default=None, max_length=32)
    mood: int | None = Field(default=None, ge=1, le=4)
    pain: str | None = Field(default=None, max_length=32)
    cough: str | None = Field(default=None, max_length=32)
    discharge: str | None = Field(default=None, max_length=32)
    owner_note: str | None = Field(default=None, max_length=2000)


class HealthCheckResponse(HealthCheckCreate):
    id: uuid.UUID
    user_id: uuid.UUID
    checked_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}
