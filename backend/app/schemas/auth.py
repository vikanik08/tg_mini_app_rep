import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


SubscriptionPlan = Literal["basic", "premium", "family", "breeder"]
AuthPlatform = Literal["dev", "telegram", "vk"]


class TelegramAuthRequest(BaseModel):
    init_data: str


class VkAuthRequest(BaseModel):
    launch_params: str


class UserInfoResponse(BaseModel):
    id: uuid.UUID
    telegram_id: int | None
    platform: AuthPlatform
    platform_user_id: str
    first_name: str | None
    last_name: str | None
    username: str | None
    timezone: str
    subscription_plan: SubscriptionPlan
    subscription_expires_at: datetime | None
    last_seen_at: datetime | None = None
    vk_messages_allowed_at: datetime | None = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfoResponse
