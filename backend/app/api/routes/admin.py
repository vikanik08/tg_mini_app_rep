from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import UserInfoResponse
from app.schemas.user import AdminSubscriptionUpdate
from app.services.notifications import send_inactive_user_message

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(authorization: str | None = Header(default=None)) -> None:
    if not settings.admin_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin approval is not configured",
        )

    expected = f"Bearer {settings.admin_secret}"
    if authorization != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin token",
        )


@router.post("/users/{telegram_id}/subscription", response_model=UserInfoResponse)
def update_user_subscription(
    telegram_id: int,
    payload: AdminSubscriptionUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.subscription_plan = payload.plan
    user.subscription_expires_at = payload.expires_at
    db.commit()
    db.refresh(user)
    return user


@router.post("/platform-users/{platform}/{platform_user_id}/subscription", response_model=UserInfoResponse)
def update_platform_user_subscription(
    platform: str,
    platform_user_id: str,
    payload: AdminSubscriptionUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    user = (
        db.query(User)
        .filter(User.platform == platform)
        .filter(User.platform_user_id == platform_user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.subscription_plan = payload.plan
    user.subscription_expires_at = payload.expires_at
    db.commit()
    db.refresh(user)
    return user


async def _send_manual_inactive_message(user: User, db: Session) -> dict[str, str | int]:
    if user.telegram_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have Telegram ID",
        )

    try:
        await send_inactive_user_message(user)
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Telegram API returned {e.response.status_code}",
        ) from e
    except (RuntimeError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e

    user.last_inactive_message_sent_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "status": "sent",
        "telegram_id": user.telegram_id,
    }


@router.post("/users/{telegram_id}/inactive-message")
async def send_user_inactive_message(
    telegram_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return await _send_manual_inactive_message(user, db)


@router.post("/platform-users/{platform}/{platform_user_id}/inactive-message")
async def send_platform_user_inactive_message(
    platform: str,
    platform_user_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    user = (
        db.query(User)
        .filter(User.platform == platform)
        .filter(User.platform_user_id == platform_user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return await _send_manual_inactive_message(user, db)
