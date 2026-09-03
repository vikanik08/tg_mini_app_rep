from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    parse_init_data,
    verify_telegram_init_data,
    verify_vk_launch_params,
)
from app.models.user import User
from app.services.promos import redeem_premium_promo


def _issue_token(user: User) -> str:
    return create_access_token(
        {
            "sub": str(user.id),
            "platform": user.platform,
            "platform_user_id": user.platform_user_id,
            "telegram_id": user.telegram_id,
        }
    )


def _get_or_create_platform_user(
    db: Session,
    *,
    platform: str,
    platform_user_id: str,
    telegram_id: int | None,
    first_name: str | None,
    last_name: str | None,
    username: str | None,
) -> User:
    user = (
        db.query(User)
        .filter(User.platform == platform)
        .filter(User.platform_user_id == platform_user_id)
        .first()
    )

    if not user and telegram_id is not None:
        user = db.query(User).filter(User.telegram_id == telegram_id).first()

    if not user:
        user = User(
            platform=platform,
            platform_user_id=platform_user_id,
            telegram_id=telegram_id,
            first_name=first_name,
            last_name=last_name,
            username=username,
            timezone="UTC",
        )
        db.add(user)
    else:
        user.platform = platform
        user.platform_user_id = platform_user_id
        user.telegram_id = telegram_id
        user.first_name = first_name
        user.last_name = last_name
        user.username = username

    user.last_seen_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(user)
    return user


def authenticate_telegram_user(init_data: str, db: Session):
    tg_user = verify_telegram_init_data(init_data)
    telegram_id = tg_user["id"]

    user = _get_or_create_platform_user(
        db,
        platform="telegram",
        platform_user_id=str(telegram_id),
        telegram_id=telegram_id,
        first_name=tg_user.get("first_name"),
        last_name=tg_user.get("last_name"),
        username=tg_user.get("username"),
    )

    start_param = parse_init_data(init_data).get("start_param", "")
    if start_param:
        try:
            user, _ = redeem_premium_promo(db, user, start_param)
        except ValueError:
            pass

    return _issue_token(user), user


def authenticate_vk_user(launch_params: str, db: Session):
    vk_params = verify_vk_launch_params(launch_params)
    vk_user_id = vk_params.get("vk_user_id")
    if not vk_user_id:
        raise ValueError("Missing vk_user_id in launch params")

    user = _get_or_create_platform_user(
        db,
        platform="vk",
        platform_user_id=str(vk_user_id),
        telegram_id=None,
        first_name=None,
        last_name=None,
        username=None,
    )

    return _issue_token(user), user
