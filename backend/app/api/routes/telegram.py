from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, status

from app.core.config import settings
from app.services.telegram_bot import handle_telegram_update


router = APIRouter(prefix="/telegram", tags=["telegram"])


@router.post("/webhook")
async def telegram_webhook(
    update: dict,
    background_tasks: BackgroundTasks,
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

    background_tasks.add_task(handle_telegram_update, update)
    return {"ok": True}
