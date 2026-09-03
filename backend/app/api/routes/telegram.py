import asyncio

from fastapi import APIRouter, Header, HTTPException, status

from app.core.config import settings
from app.services.telegram_bot import handle_telegram_update


router = APIRouter(prefix="/telegram", tags=["telegram"])


def _log_task_error(task: asyncio.Task) -> None:
    try:
        task.result()
    except Exception as exc:  # pragma: no cover - webhook delivery safety net
        print(f"Telegram webhook task failed: {type(exc).__name__}")


@router.post("/webhook")
async def telegram_webhook(
    update: dict,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
):
    if (
        settings.telegram_webhook_secret
        and x_telegram_bot_api_secret_token != settings.telegram_webhook_secret
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram webhook secret",
        )

    task = asyncio.create_task(handle_telegram_update(update))
    task.add_done_callback(_log_task_error)
    return {"ok": True}
