from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import UserInfoResponse
from app.schemas.user import AdminSubscriptionUpdate

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
