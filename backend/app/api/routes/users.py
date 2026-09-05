from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import UserInfoResponse
from app.schemas.user import UserUpdate, VkMessagesUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserInfoResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserInfoResponse)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.timezone is not None:
        try:
            ZoneInfo(payload.timezone)
        except ZoneInfoNotFoundError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid timezone",
            ) from e

        current_user.timezone = payload.timezone

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/vk-messages", response_model=UserInfoResponse)
def update_vk_messages(
    payload: VkMessagesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.platform != "vk":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="VK messages can be enabled only for VK users",
        )

    current_user.vk_messages_allowed_at = (
        datetime.now(timezone.utc) if payload.enabled else None
    )
    db.commit()
    db.refresh(current_user)
    return current_user
