from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.db import engine


router = APIRouter(tags=["health"])
release = "20261014-db-check-2"


def check_database() -> None:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))


def classify_database_error(exc: SQLAlchemyError) -> str:
    message = str(getattr(exc, "orig", exc)).lower()

    if "password authentication failed" in message:
        return "authentication_failed"
    if "connection refused" in message:
        return "connection_refused"
    if "timeout" in message or "timed out" in message:
        return "connection_timeout"
    if "could not translate host name" in message or "name or service not known" in message:
        return "host_not_found"
    if "database" in message and "does not exist" in message:
        return "database_not_found"
    if "role" in message and "does not exist" in message:
        return "user_not_found"

    return "database_unavailable"


@router.get("/health")
def health():
    try:
        check_database()
    except SQLAlchemyError as exc:
        return {
            "status": "degraded",
            "database": "error",
            "reason": classify_database_error(exc),
            "release": release,
        }

    return {"status": "ok", "database": "ok", "release": release}


@router.get("/health/db")
def database_health():
    try:
        check_database()
    except SQLAlchemyError as exc:
        reason = classify_database_error(exc)
        raise HTTPException(
            status_code=503,
            detail=f"Database unavailable: {reason}",
        ) from exc

    return {"status": "ok", "database": "ok", "release": release}
