from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.auth import TokenResponse

router = APIRouter(prefix="/dev", tags=["dev"])


@router.post("/login", response_model=TokenResponse)
def dev_login(
    telegram_id: int,
    db: Session = Depends(get_db),
):
    if settings.env != "dev" or not settings.allow_dev_login:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dev login is disabled outside dev environment",
        )

    user = (
        db.query(User)
        .filter(User.platform == "dev")
        .filter(User.platform_user_id == str(telegram_id))
        .first()
    )

    if not user:
        user = db.query(User).filter(User.telegram_id == telegram_id).first()

    if not user:
        user = User(
            platform="dev",
            platform_user_id=str(telegram_id),
            telegram_id=telegram_id,
            first_name="Dev",
            last_name=None,
            username=f"dev_{telegram_id}",
            timezone="UTC",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.platform = "dev"
        user.platform_user_id = str(telegram_id)
        user.telegram_id = telegram_id
        if not user.first_name:
            user.first_name = "Dev"
        if not user.username:
            user.username = f"dev_{telegram_id}"
        db.commit()
        db.refresh(user)

    token = create_access_token(
        {
            "sub": str(user.id),
            "platform": user.platform,
            "platform_user_id": user.platform_user_id,
            "telegram_id": user.telegram_id,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }
