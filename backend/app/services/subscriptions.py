from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.pet import Pet
from app.models.user import User


SubscriptionPlan = str


def get_effective_plan(user: User) -> SubscriptionPlan:
    expires_at = user.subscription_expires_at
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if (
        user.subscription_plan in {"premium", "family"}
        and expires_at is not None
        and expires_at <= datetime.now(timezone.utc)
    ):
        return "basic"

    if user.subscription_plan in {"basic", "premium", "family"}:
        return user.subscription_plan

    return "basic"


def has_premium_access(user: User) -> bool:
    return get_effective_plan(user) in {"premium", "family"}


def get_pet_limit(user: User) -> int | None:
    plan = get_effective_plan(user)

    if plan == "family":
        return None
    if plan == "premium":
        return 2
    return 1


def get_active_reminder_limit(user: User) -> int | None:
    plan = get_effective_plan(user)

    if plan in {"premium", "family"}:
        return None
    return 5


def assert_can_create_pet(db: Session, user: User) -> None:
    limit = get_pet_limit(user)

    if limit is None:
        return

    pets_count = db.query(Pet).filter(Pet.user_id == user.id).count()
    if pets_count >= limit:
        raise PermissionError("Чтобы добавить еще одного питомца, оформите подписку")


def assert_can_create_active_reminder(
    db: Session,
    user: User,
    scheduled_at: datetime,
    exclude_event_id: UUID | None = None,
) -> None:
    limit = get_active_reminder_limit(user)

    if limit is None:
        return

    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)

    if scheduled_at < datetime.now(timezone.utc):
        return

    query = (
        db.query(Event)
        .filter(Event.user_id == user.id)
        .filter(Event.is_done.is_(False))
        .filter(Event.scheduled_at >= datetime.now(timezone.utc))
    )

    if exclude_event_id is not None:
        query = query.filter(Event.id != exclude_event_id)

    active_count = query.count()

    if active_count >= limit:
        raise PermissionError("В базовом тарифе доступно до 5 активных напоминаний")


def assert_can_use_health_tracker(user: User) -> None:
    if not has_premium_access(user):
        raise PermissionError("Трекер здоровья доступен в подписке Премиум или Семейная")
