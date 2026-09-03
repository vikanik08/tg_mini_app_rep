from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.promo_redemption import PromoRedemption
from app.models.user import User


def _normalize_code(value: str) -> str:
    return value.strip().lower()


def _as_aware_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def redeem_premium_promo(db: Session, user: User, code: str) -> tuple[User, bool]:
    normalized_code = _normalize_code(code)
    expected_code = _normalize_code(settings.promo_premium_code)

    if not expected_code or normalized_code != expected_code:
        raise ValueError("Invalid promo code")

    existing_redemption = (
        db.query(PromoRedemption)
        .filter(PromoRedemption.user_id == user.id)
        .filter(PromoRedemption.code == normalized_code)
        .first()
    )
    if existing_redemption:
        return user, True

    now = datetime.now(timezone.utc)
    current_expires_at = _as_aware_utc(user.subscription_expires_at)
    starts_at = now

    if (
        user.subscription_plan == "premium"
        and current_expires_at is not None
        and current_expires_at > now
    ):
        starts_at = current_expires_at

    if user.subscription_plan == "family" and current_expires_at and current_expires_at > now:
        expires_at = current_expires_at
        plan = "family"
    else:
        expires_at = starts_at + timedelta(days=settings.promo_premium_days)
        plan = "premium"
        user.subscription_plan = plan
        user.subscription_expires_at = expires_at

    db.add(
        PromoRedemption(
            user_id=user.id,
            code=normalized_code,
            plan=plan,
            starts_at=starts_at,
            expires_at=expires_at,
        )
    )
    db.commit()
    db.refresh(user)
    return user, False
