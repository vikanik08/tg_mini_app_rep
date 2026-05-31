import asyncio
from datetime import datetime, timezone
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


async def notification_worker(interval_seconds: int = 60) -> None:
    while True:
        try:
            await process_due_reminders()
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # pragma: no cover - worker safety net
            print(f"Reminder worker error: {exc}")

        await asyncio.sleep(interval_seconds)
