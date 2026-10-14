from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.db import engine


router = APIRouter(tags=["health"])
release = "20261014-db-check-1"


def check_database() -> None:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))


@router.get("/health")
def health():
    try:
        check_database()
    except SQLAlchemyError as exc:
        return {
            "status": "degraded",
            "database": "error",
            "error": type(exc).__name__,
            "release": release,
        }

    return {"status": "ok", "database": "ok", "release": release}


@router.get("/health/db")
def database_health():
    try:
        check_database()
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Database unavailable: {type(exc).__name__}",
        ) from exc

    return {"status": "ok", "database": "ok", "release": release}
