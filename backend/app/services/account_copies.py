import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.models.account_copy import AccountCopy
from app.models.event import Event
from app.models.health_check import HealthCheck
from app.models.pet import Pet
from app.models.user import User
from app.schemas.account_copy import AccountCopyResponse


ACCOUNT_COPY_TTL_DAYS = 14


def _as_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _is_pending_and_active(account_copy: AccountCopy, now: datetime) -> bool:
    return account_copy.status == "pending" and _as_aware_utc(account_copy.expires_at) > now


def _mark_expired_if_needed(db: Session, account_copy: AccountCopy) -> None:
    if account_copy.status != "pending":
        return
    if _as_aware_utc(account_copy.expires_at) > datetime.now(timezone.utc):
        return

    account_copy.status = "expired"
    db.commit()
    db.refresh(account_copy)


def _user_name(user: User | None) -> str | None:
    if user is None:
        return None

    name = " ".join(part for part in [user.first_name, user.last_name] if part)
    return name or user.username or None


def _copy_column_values(instance: Any, excluded: set[str]) -> dict[str, Any]:
    return {
        column.name: getattr(instance, column.name)
        for column in instance.__table__.columns
        if column.name not in excluded
    }


def _source_counts(db: Session, account_copy: AccountCopy) -> tuple[int, int, int]:
    if account_copy.status == "accepted":
        return (
            account_copy.copied_pets,
            account_copy.copied_events,
            account_copy.copied_health_checks,
        )

    pet_count = db.query(Pet).filter(Pet.user_id == account_copy.from_user_id).count()
    event_count = db.query(Event).filter(Event.user_id == account_copy.from_user_id).count()
    health_check_count = (
        db.query(HealthCheck)
        .filter(HealthCheck.user_id == account_copy.from_user_id)
        .count()
    )
    return pet_count, event_count, health_check_count


def serialize_account_copy(
    db: Session,
    account_copy: AccountCopy,
    viewer: User | None = None,
) -> AccountCopyResponse:
    pet_count, event_count, health_check_count = _source_counts(db, account_copy)
    return AccountCopyResponse(
        token=account_copy.token,
        status=account_copy.status,
        from_user_name=_user_name(account_copy.from_user),
        source_platform=account_copy.from_user.platform,
        is_sender=viewer is not None and account_copy.from_user_id == viewer.id,
        pet_count=pet_count,
        event_count=event_count,
        health_check_count=health_check_count,
        expires_at=account_copy.expires_at,
        created_at=account_copy.created_at,
        accepted_at=account_copy.accepted_at,
        cancelled_at=account_copy.cancelled_at,
    )


def create_account_copy(db: Session, user: User) -> AccountCopy:
    if db.query(Pet).filter(Pet.user_id == user.id).count() == 0:
        raise ValueError("Сначала добавьте хотя бы одного питомца")

    now = datetime.now(timezone.utc)
    existing_copy = (
        db.query(AccountCopy)
        .filter(AccountCopy.from_user_id == user.id)
        .filter(AccountCopy.status == "pending")
        .order_by(AccountCopy.created_at.desc())
        .first()
    )

    if existing_copy and _is_pending_and_active(existing_copy, now):
        return existing_copy

    if existing_copy:
        existing_copy.status = "expired"

    account_copy = AccountCopy(
        from_user_id=user.id,
        token=secrets.token_urlsafe(18),
        status="pending",
        expires_at=now + timedelta(days=ACCOUNT_COPY_TTL_DAYS),
    )
    db.add(account_copy)
    db.commit()
    db.refresh(account_copy)
    return account_copy


def get_active_account_copy(db: Session, token: str) -> AccountCopy:
    account_copy = db.query(AccountCopy).filter(AccountCopy.token == token).first()
    if not account_copy:
        raise ValueError("Ссылка копирования не найдена")

    _mark_expired_if_needed(db, account_copy)
    if account_copy.status != "pending":
        raise ValueError("Ссылка копирования уже использована или истекла")

    return account_copy


def accept_account_copy(db: Session, user: User, token: str) -> AccountCopy:
    account_copy = (
        db.query(AccountCopy)
        .filter(AccountCopy.token == token)
        .with_for_update()
        .first()
    )
    if not account_copy:
        raise ValueError("Ссылка копирования не найдена")

    _mark_expired_if_needed(db, account_copy)
    if account_copy.status != "pending":
        raise ValueError("Ссылка копирования уже использована или истекла")
    if account_copy.from_user_id == user.id:
        raise PermissionError("Нельзя скопировать данные в тот же аккаунт")
    if account_copy.from_user.platform == user.platform:
        raise PermissionError("Откройте ссылку в аккаунте другой платформы: VK или Telegram")

    already_copied = (
        db.query(AccountCopy)
        .filter(AccountCopy.status == "accepted")
        .filter(
            or_(
                and_(
                    AccountCopy.from_user_id == account_copy.from_user_id,
                    AccountCopy.to_user_id == user.id,
                ),
                and_(
                    AccountCopy.from_user_id == user.id,
                    AccountCopy.to_user_id == account_copy.from_user_id,
                ),
            )
        )
        .first()
    )
    if already_copied:
        raise PermissionError("Данные между этими аккаунтами уже копировались")

    source_pets = (
        db.query(Pet)
        .filter(Pet.user_id == account_copy.from_user_id)
        .order_by(Pet.created_at.asc())
        .all()
    )
    if not source_pets:
        raise ValueError("В исходном аккаунте нет питомцев для копирования")

    copied_pets = 0
    copied_events = 0
    copied_health_checks = 0

    for source_pet in source_pets:
        pet_values = _copy_column_values(source_pet, {"id", "user_id"})
        new_pet = Pet(id=uuid.uuid4(), user_id=user.id, **pet_values)
        db.add(new_pet)
        db.flush()
        copied_pets += 1

        source_events = (
            db.query(Event)
            .filter(Event.user_id == account_copy.from_user_id)
            .filter(Event.pet_id == source_pet.id)
            .all()
        )
        for source_event in source_events:
            event_values = _copy_column_values(
                source_event,
                {"id", "user_id", "pet_id", "reminder_sent_at"},
            )
            db.add(
                Event(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    pet_id=new_pet.id,
                    reminder_sent_at=None,
                    **event_values,
                )
            )
            copied_events += 1

        source_checks = (
            db.query(HealthCheck)
            .filter(HealthCheck.user_id == account_copy.from_user_id)
            .filter(HealthCheck.pet_id == source_pet.id)
            .all()
        )
        for source_check in source_checks:
            check_values = _copy_column_values(
                source_check,
                {"id", "user_id", "pet_id"},
            )
            db.add(
                HealthCheck(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    pet_id=new_pet.id,
                    **check_values,
                )
            )
            copied_health_checks += 1

    account_copy.to_user_id = user.id
    account_copy.status = "accepted"
    account_copy.accepted_at = datetime.now(timezone.utc)
    account_copy.copied_pets = copied_pets
    account_copy.copied_events = copied_events
    account_copy.copied_health_checks = copied_health_checks

    db.commit()
    db.refresh(account_copy)
    return account_copy


def cancel_account_copy(db: Session, user: User, token: str) -> AccountCopy:
    account_copy = get_active_account_copy(db, token)
    if account_copy.from_user_id != user.id:
        raise PermissionError("Можно отменить только свою ссылку копирования")

    account_copy.status = "cancelled"
    account_copy.cancelled_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(account_copy)
    return account_copy
