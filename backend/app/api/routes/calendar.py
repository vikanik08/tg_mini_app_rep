import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.calendar import CalendarDayResponse, CalendarMonthResponse
from app.services.calendar import get_calendar_day, get_calendar_month

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/month", response_model=CalendarMonthResponse)
def calendar_month(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    pet_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_calendar_month(db, current_user, year, month, pet_id)


@router.get("/day", response_model=CalendarDayResponse)
def calendar_day(
    date_value: date = Query(..., alias="date"),
    pet_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return get_calendar_day(db, current_user, date_value, pet_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
