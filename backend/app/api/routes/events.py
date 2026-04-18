import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.event import EventCreate, EventResponse, EventUpdate
from app.services.events import (
    complete_event,
    create_event,
    delete_event,
    get_event_by_id,
    list_events,
    uncomplete_event,
    update_event,
)

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventResponse])
def get_events(
    pet_id: uuid.UUID | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    only_upcoming: bool = Query(default=False),
    only_incomplete: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_events(
        db=db,
        user=current_user,
        pet_id=pet_id,
        date_from=date_from,
        date_to=date_to,
        only_upcoming=only_upcoming,
        only_incomplete=only_incomplete,
    )


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event_route(
    payload: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return create_event(db, current_user, payload)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = get_event_by_id(db, current_user, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.patch("/{event_id}", response_model=EventResponse)
def update_event_route(
    event_id: uuid.UUID,
    payload: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = get_event_by_id(db, current_user, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    try:
        return update_event(db, current_user, event, payload)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event_route(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = get_event_by_id(db, current_user, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    delete_event(db, event)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{event_id}/complete", response_model=EventResponse)
def complete_event_route(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = get_event_by_id(db, current_user, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    return complete_event(db, event)


@router.post("/{event_id}/uncomplete", response_model=EventResponse)
def uncomplete_event_route(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = get_event_by_id(db, current_user, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    return uncomplete_event(db, event)
