import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import EventType


class EventBase(BaseModel):
    pet_id: uuid.UUID
    type: EventType
    title: str = Field(..., min_length=1, max_length=128)
    scheduled_at: datetime
    notes: str | None = Field(default=None, max_length=2000)


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    pet_id: uuid.UUID | None = None
    type: EventType | None = None
    title: str | None = Field(default=None, min_length=1, max_length=128)
    scheduled_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=2000)
    is_done: bool | None = None


class EventResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    pet_id: uuid.UUID
    type: EventType
    title: str
    scheduled_at: datetime
    is_done: bool
    done_at: datetime | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}