from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.auth import SubscriptionPlan, UserInfoResponse


class PromoRedeemRequest(BaseModel):
    code: str = Field(min_length=1, max_length=64)


class PromoRedeemResponse(BaseModel):
    code: str
    plan: SubscriptionPlan
    expires_at: datetime | None
    already_redeemed: bool
    user: UserInfoResponse
