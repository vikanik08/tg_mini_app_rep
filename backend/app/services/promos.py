from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.promo_redemption import PromoRedemption
from app.models.user import User
from app.schemas.auth import SubscriptionPlan


PROMO_OFFERS: dict[str, tuple[SubscriptionPlan, int]] = {
    "premium30": ("premium", 30),
    "premium7": ("premium", 7),
    "family30": ("family", 30),
    "family7": ("family", 7),
}

PLAN_RANK: dict[SubscriptionPlan, int] = {
    "basic": 0,
    "premium": 1,
    "family": 2,
}


def _normalize_code(value: str) -> str:
    return value.strip().lower()


def _as_aware_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def _get_promo_offer(code: str) -> tuple[SubscriptionPlan, int] | None:
    offer = PROMO_OFFERS.get(code)
    if offer:
        return offer

    expected_code = _normalize_code(settings.promo_premium_code)
    if expected_code and code == expected_code:
        return "premium", settings.promo_premium_days

    return None


def _has_active_subscription(user: User, now: datetime) -> bool:
    expires_at = _as_aware_utc(user.subscription_expires_at)
    return (
        user.subscription_plan in ("premium", "family")
        and expires_at is not None
        and expires_at > now
    )


def _can_apply_plan(user: User, plan: SubscriptionPlan, now: datetime) -> bool:
    if not _has_active_subscription(user, now):
        return True

    return PLAN_RANK[plan] >= PLAN_RANK[user.subscription_plan]


def redeem_premium_promo(db: Session, user: User, code: str) -> tuple[User, bool]:
    normalized_code = _normalize_code(code)
    offer = _get_promo_offer(normalized_code)

    if not offer:
        raise ValueError("Invalid promo code")

    offer_plan, offer_days = offer

    existing_redemption = (
        db.query(PromoRedemption)
        .filter(PromoRedemption.user_id == user.id)
        .filter(PromoRedemption.code == normalized_code)
        .first()
    )
    if existing_redemption:
        existing_expires_at = _as_aware_utc(existing_redemption.expires_at)
        current_expires_at = _as_aware_utc(user.subscription_expires_at)
        now = datetime.now(timezone.utc)

        if (
            existing_redemption.plan in ("premium", "family")
            and existing_expires_at is not None
            and existing_expires_at > now
            and _can_apply_plan(user, existing_redemption.plan, now)
            and (
                user.subscription_plan != existing_redemption.plan
                or current_expires_at is None
                or current_expires_at < existing_expires_at
            )
        ):
            user.subscription_plan = existing_redemption.plan
            user.subscription_expires_at = existing_expires_at
            db.commit()
            db.refresh(user)

        return user, True

    now = datetime.now(timezone.utc)
    current_expires_at = _as_aware_utc(user.subscription_expires_at)
    starts_at = now

    if (
        user.subscription_plan in ("premium", "family")
        and current_expires_at is not None
        and current_expires_at > now
    ):
        starts_at = current_expires_at

    expires_at = starts_at + timedelta(days=offer_days)

    if _can_apply_plan(user, offer_plan, now):
        plan = offer_plan
        user.subscription_plan = plan
        user.subscription_expires_at = expires_at
    else:
        plan = user.subscription_plan
        expires_at = current_expires_at or now

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
