import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.pet import Pet
from app.models.user import User
from app.schemas.event import EventCreate, EventUpdate


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def list_events(
    db: Session,
    user: User,
    pet_id: uuid.UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    only_upcoming: bool = False,
    only_incomplete: bool = False,
) -> list[Event]:
    query = db.query(Event).filter(Event.user_id == user.id)

    if pet_id:
        query = query.filter(Event.pet_id == pet_id)

    if date_from:
        query = query.filter(Event.scheduled_at >= date_from)

    if date_to:
        query = query.filter(Event.scheduled_at <= date_to)

    if only_upcoming:
        query = query.filter(Event.scheduled_at >= datetime.now(timezone.utc))

    if only_incomplete:
        query = query.filter(Event.is_done.is_(False))

    return query.order_by(Event.scheduled_at.asc()).all()


def create_event(db: Session, user: User, payload: EventCreate) -> Event:
    pet = db.query(Pet).filter(Pet.id == payload.pet_id, Pet.user_id == user.id).first()
    if not pet:
        raise ValueError("Pet not found")

    event = Event(
        user_id=user.id,
        pet_id=payload.pet_id,
        type=payload.type,
        title=payload.title,
        scheduled_at=_normalize_datetime(payload.scheduled_at),
        notes=payload.notes,
        is_done=False,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def get_event_by_id(db: Session, user: User, event_id: uuid.UUID) -> Event | None:
    return db.query(Event).filter(Event.id == event_id, Event.user_id == user.id).first()


def update_event(db: Session, user: User, event: Event, payload: EventUpdate) -> Event:
    update_data = payload.model_dump(exclude_unset=True)

    if "pet_id" in update_data and update_data["pet_id"] is not None:
        pet = db.query(Pet).filter(Pet.id == update_data["pet_id"], Pet.user_id == user.id).first()
        if not pet:
            raise ValueError("Pet not found")

    for field, value in update_data.items():
        if field == "scheduled_at" and value is not None:
            value = _normalize_datetime(value)
        setattr(event, field, value)

    db.commit()
    db.refresh(event)
    return event


def delete_event(db: Session, event: Event) -> None:
    db.delete(event)
    db.commit()


def complete_event(db: Session, event: Event) -> Event:
    event.is_done = True
    event.done_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(event)
    return event


def uncomplete_event(db: Session, event: Event) -> Event:
    event.is_done = False
    event.done_at = None
    db.commit()
    db.refresh(event)
    return event
