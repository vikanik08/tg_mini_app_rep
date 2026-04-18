from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.auth import SubscriptionPlan


class UserUpdate(BaseModel):
    timezone: str | None = Field(default=None, min_length=1, max_length=64)


class AdminSubscriptionUpdate(BaseModel):
    plan: SubscriptionPlan
    expires_at: datetime | None = None
