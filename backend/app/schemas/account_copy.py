from datetime import datetime
from typing import Literal

from pydantic import BaseModel


AccountCopyStatus = Literal["pending", "accepted", "cancelled", "expired"]


class AccountCopyResponse(BaseModel):
    token: str
    status: AccountCopyStatus
    from_user_name: str | None
    source_platform: str
    is_sender: bool = False
    pet_count: int
    event_count: int
    health_check_count: int
    expires_at: datetime
    created_at: datetime
    accepted_at: datetime | None = None
    cancelled_at: datetime | None = None
