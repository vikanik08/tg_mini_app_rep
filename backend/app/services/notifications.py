import asyncio
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import SessionLocal
from app.models.event import Event
from app.models.pet import Pet
from app.models.user import User


def _safe_timezone(value: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(value or "UTC")
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def _format_local_time(value: datetime, timezone_name: str | None) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)

    local_value = value.astimezone(_safe_timezone(timezone_name))
    return local_value.strftime("%d.%m.%Y в %H:%M")


def _build_reminder_text(event: Event, pet: Pet, user: User) -> str:
    local_time = _format_local_time(event.scheduled_at, user.timezone)
    notes = f"\n\nЗаметка: {event.notes}" if event.notes else ""
    return (
        "Напоминание от СмартПет\n\n"
        f"{event.title}\n"
        f"Питомец: {pet.name}\n"
        f"Время: {local_time}"
        f"{notes}"
    )


def _build_inactive_user_text(user: User) -> str:
    first_name = user.first_name or "привет"
    return (
        f"{first_name}, загляните в SmartPet Helper 🐾\n\n"
        "Проверьте ближайшие напоминания и внесите новые наблюдения о здоровье питомца."
    )


async def _send_telegram_message(chat_id: int, text: str) -> None:
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"

    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.post(
            url,
            json={
                "chat_id": chat_id,
                "text": text,
                "disable_web_page_preview": True,
            },
        )
        response.raise_for_status()


def _get_due_events(db: Session, now: datetime, limit: int = 25) -> list[Event]:
    return (
        db.query(Event)
        .filter(Event.is_done.is_(False))
        .filter(Event.reminder_sent_at.is_(None))
        .filter(Event.scheduled_at <= now)
        .order_by(Event.scheduled_at.asc())
        .limit(limit)
        .all()
    )


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


async def process_due_reminders() -> int:
    if not settings.telegram_bot_token:
        return 0

    sent_count = 0
    now = datetime.now(timezone.utc)

    db = SessionLocal()
    try:
        events = _get_due_events(db, now)

        for event in events:
            user = db.query(User).filter(User.id == event.user_id).first()
            pet = db.query(Pet).filter(Pet.id == event.pet_id).first()

            if not user or not pet or user.telegram_id is None:
                event.reminder_sent_at = now
                continue

            try:
                await _send_telegram_message(
                    chat_id=user.telegram_id,
                    text=_build_reminder_text(event, pet, user),
                )
            except httpx.HTTPStatusError as exc:  # pragma: no cover - network/API failure path
                status_code = exc.response.status_code
                print(f"Failed to send reminder {event.id}: Telegram API status {status_code}")

                if status_code in (400, 403):
                    event.reminder_sent_at = now
                continue
            except Exception as exc:  # pragma: no cover - network/API failure path
                print(f"Failed to send reminder {event.id}: {type(exc).__name__}")
                continue

            event.reminder_sent_at = datetime.now(timezone.utc)
            sent_count += 1

        db.commit()
    finally:
        db.close()

    return sent_count


async def process_inactive_users() -> int:
    if not settings.telegram_bot_token or not settings.run_inactive_user_messages:
        return 0

    now = datetime.now(timezone.utc)
    inactive_before = now - timedelta(days=settings.inactive_user_days)
    cooldown_before = now - timedelta(days=settings.inactive_message_cooldown_days)
    sent_count = 0

    db = SessionLocal()
    try:
        users = (
            db.query(User)
            .filter(User.platform == "telegram")
            .filter(User.telegram_id.is_not(None))
            .filter(User.last_seen_at.is_not(None))
            .filter(User.last_seen_at <= inactive_before)
            .limit(25)
            .all()
        )

        for user in users:
            last_sent_at = _normalize_datetime(user.last_inactive_message_sent_at)
            if last_sent_at is not None and last_sent_at > cooldown_before:
                continue

            try:
                await _send_telegram_message(
                    chat_id=user.telegram_id,
                    text=_build_inactive_user_text(user),
                )
            except httpx.HTTPStatusError as exc:  # pragma: no cover - network/API failure path
                print(
                    f"Failed to send inactive user message {user.id}: "
                    f"Telegram API status {exc.response.status_code}"
                )
                continue
            except Exception as exc:  # pragma: no cover - network/API failure path
                print(f"Failed to send inactive user message {user.id}: {type(exc).__name__}")
                continue

            user.last_inactive_message_sent_at = now
            sent_count += 1

        db.commit()
    finally:
        db.close()

    return sent_count


async def notification_worker(interval_seconds: int = 60) -> None:
    while True:
        try:
            await process_due_reminders()
            await process_inactive_users()
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # pragma: no cover - worker safety net
            print(f"Reminder worker error: {exc}")

        await asyncio.sleep(interval_seconds)
