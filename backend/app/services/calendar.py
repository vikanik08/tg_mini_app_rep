import uuid
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.user import User


def _safe_timezone(value: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(value or "UTC")
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def get_month_range(year: int, month: int, timezone_name: str | None) -> tuple[datetime, datetime]:
    user_tz = _safe_timezone(timezone_name)
    start = datetime(year, month, 1, 0, 0, 0, tzinfo=user_tz)

    if month == 12:
        end = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=user_tz)
    else:
        end = datetime(year, month + 1, 1, 0, 0, 0, tzinfo=user_tz)

    return start.astimezone(timezone.utc), end.astimezone(timezone.utc)


def get_calendar_month(
    db: Session,
    user: User,
    year: int,
    month: int,
    pet_id: uuid.UUID | None = None,
) -> dict:
    user_tz = _safe_timezone(user.timezone)
    start, end = get_month_range(year, month, user.timezone)

    query = db.query(Event).filter(
        Event.user_id == user.id,
        Event.scheduled_at >= start,
        Event.scheduled_at < end,
    )

    if pet_id:
        query = query.filter(Event.pet_id == pet_id)

    events = query.order_by(Event.scheduled_at.asc()).all()

    grouped = defaultdict(list)
    for event in events:
        scheduled_at = event.scheduled_at
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
        event_day = scheduled_at.astimezone(user_tz).date()
        grouped[event_day].append(event)

    days = []
    for event_day, day_events in sorted(grouped.items()):
        total = len(day_events)
        completed = sum(1 for e in day_events if e.is_done)
        incomplete = total - completed

        days.append(
            {
                "date": event_day,
                "total_events": total,
                "incomplete_events": incomplete,
                "completed_events": completed,
            }
        )

    return {
        "year": year,
        "month": month,
        "days": days,
    }


def get_calendar_day(
    db: Session,
    user: User,
    target_date: date,
    pet_id: uuid.UUID | None = None,
) -> dict:
    user_tz = _safe_timezone(user.timezone)
    start = datetime.combine(target_date, time.min).replace(tzinfo=user_tz)
    end = start + timedelta(days=1)
    start_utc = start.astimezone(timezone.utc)
    end_utc = end.astimezone(timezone.utc)

    query = db.query(Event).filter(
        Event.user_id == user.id,
        Event.scheduled_at >= start_utc,
        Event.scheduled_at < end_utc,
    )

    if pet_id:
        query = query.filter(Event.pet_id == pet_id)

    events = query.order_by(Event.scheduled_at.asc()).all()

    return {
        "date": target_date,
        "events": events,
    }
