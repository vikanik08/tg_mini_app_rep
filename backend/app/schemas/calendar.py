from datetime import date

from pydantic import BaseModel

from app.schemas.event import EventResponse


class CalendarDaySummary(BaseModel):
    date: date
    total_events: int
    incomplete_events: int
    completed_events: int


class CalendarMonthResponse(BaseModel):
    year: int
    month: int
    days: list[CalendarDaySummary]


class CalendarDayResponse(BaseModel):
    date: date
    events: list[EventResponse]