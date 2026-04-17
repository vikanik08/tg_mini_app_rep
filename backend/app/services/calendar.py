import uuid
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.user import User


def get_month_range(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)

    if month == 12:
        end = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    return start, end


def get_calendar_month(
    db: Session,
    user: User,
    year: int,
    month: int,
    pet_id: uuid.UUID | None = None,
) -> dict:
    start, end = get_month_range(year, month)

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
        event_day = event.scheduled_at.date()
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
    start = datetime.combine(target_date, time.min).replace(tzinfo=timezone.utc)
    end = start + timedelta(days=1)

    query = db.query(Event).filter(
        Event.user_id == user.id,
        Event.scheduled_at >= start,
        Event.scheduled_at < end,
    )

    if pet_id:
        query = query.filter(Event.pet_id == pet_id)

    events = query.order_by(Event.scheduled_at.asc()).all()

    return {
        "date": target_date,
        "events": events,
    }
