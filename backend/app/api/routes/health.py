from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.db import engine


router = APIRouter(tags=["health"])
release = "20261017-telegram-check-1"


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


@router.get("/health/vk")
def vk_health():
    app_id = settings.vk_app_id.strip()
    secret_configured = bool(settings.vk_app_secret.strip())

    return {
        "status": "ok" if app_id and secret_configured else "degraded",
        "vk_app_id": app_id or None,
        "vk_app_secret_configured": secret_configured,
        "release": release,
    }


@router.get("/health/telegram")
def telegram_health():
    mini_app_url = settings.telegram_mini_app_url.strip()
    public_base_url = settings.public_base_url.strip()
    token_configured = bool(settings.telegram_bot_token.strip())
    uses_https = mini_app_url.startswith("https://")

    return {
        "status": "ok" if token_configured and uses_https else "degraded",
        "telegram_bot_token_configured": token_configured,
        "telegram_mini_app_url": mini_app_url or None,
        "telegram_mini_app_version": settings.telegram_mini_app_version or None,
        "public_base_url": public_base_url or None,
        "run_telegram_bot_polling": settings.run_telegram_bot_polling,
        "telegram_webhook_configured": bool(settings.telegram_webhook_url.strip()),
        "release": release,
    }
