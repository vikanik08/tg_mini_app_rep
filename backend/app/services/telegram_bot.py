from typing import Any

import httpx

from app.core.config import settings
from app.services.notifications import _send_telegram_message


OPEN_APP_TEXT = "Открыть мини апп"
SUPPORT_PROJECT_TEXT = "Поддержать проект"
CONTACT_US_TEXT = "Связаться с нами"


def _mini_app_url(path: str = "") -> str:
    return f"{settings.telegram_mini_app_url.rstrip('/')}{path}"


def _main_keyboard() -> dict[str, Any]:
    return {
        "keyboard": [
            [{"text": OPEN_APP_TEXT}],
            [{"text": SUPPORT_PROJECT_TEXT}, {"text": CONTACT_US_TEXT}],
        ],
        "resize_keyboard": True,
        "is_persistent": True,
        "one_time_keyboard": False,
    }


def _open_app_inline_keyboard(path: str = "") -> dict[str, Any]:
    return {
        "inline_keyboard": [
            [{"text": "Открыть SmartPet", "web_app": {"url": _mini_app_url(path)}}],
        ],
    }


def _contact_inline_keyboard() -> dict[str, Any]:
    return {
        "inline_keyboard": [
            [{"text": "Открыть чат поддержки", "url": settings.telegram_support_url}],
        ],
    }


async def _telegram_api_post(method: str, payload: dict[str, Any]) -> dict[str, Any]:
    if not settings.telegram_bot_token:
        raise RuntimeError("Telegram bot token is not configured")

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/{method}"

    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        return response.json()


async def send_bot_menu(chat_id: int, first_name: str | None = None) -> None:
    name = first_name or "привет"
    await _send_telegram_message(
        chat_id=chat_id,
        text=(
            f"{name}, SmartPet Helper на связи.\n\n"
            "Можно открыть mini app, поддержать проект или написать нам."
        ),
        reply_markup=_main_keyboard(),
    )


async def handle_telegram_update(update: dict[str, Any]) -> None:
    message = update.get("message")
    if not isinstance(message, dict):
        return

    chat = message.get("chat")
    if not isinstance(chat, dict):
        return

    chat_id = chat.get("id")
    if not isinstance(chat_id, int):
        return

    user = message.get("from") if isinstance(message.get("from"), dict) else {}
    first_name = user.get("first_name") if isinstance(user.get("first_name"), str) else None
    text = message.get("text") if isinstance(message.get("text"), str) else ""

    if text.startswith("/start"):
        await send_bot_menu(chat_id, first_name)
        return

    if text == OPEN_APP_TEXT:
        await _send_telegram_message(
            chat_id=chat_id,
            text="Откройте SmartPet Helper по кнопке ниже.",
            reply_markup=_open_app_inline_keyboard(),
        )
        return

    if text == SUPPORT_PROJECT_TEXT:
        await _send_telegram_message(
            chat_id=chat_id,
            text="Спасибо, что хотите поддержать SmartPet Helper. Откройте раздел подписки в mini app.",
            reply_markup=_open_app_inline_keyboard("/subscriptions"),
        )
        return

    if text == CONTACT_US_TEXT:
        await _send_telegram_message(
            chat_id=chat_id,
            text=f"Напишите нам сюда: {settings.telegram_support_url}",
            reply_markup=_contact_inline_keyboard(),
        )
        return

    await send_bot_menu(chat_id, first_name)


async def setup_telegram_bot() -> dict[str, Any]:
    webhook_url = (
        settings.telegram_webhook_url
        or f"{settings.public_base_url.rstrip('/')}/telegram/webhook"
    )
    webhook_payload: dict[str, Any] = {
        "url": webhook_url,
        "allowed_updates": ["message"],
        "drop_pending_updates": True,
    }
    if settings.telegram_webhook_secret:
        webhook_payload["secret_token"] = settings.telegram_webhook_secret

    commands_response = await _telegram_api_post(
        "setMyCommands",
        {
            "commands": [
                {"command": "start", "description": "Открыть меню SmartPet"},
            ],
        },
    )
    menu_response = await _telegram_api_post(
        "setChatMenuButton",
        {
            "menu_button": {
                "type": "web_app",
                "text": "Мини Апп",
                "web_app": {"url": _mini_app_url()},
            },
        },
    )
    webhook_response = await _telegram_api_post("setWebhook", webhook_payload)

    return {
        "webhook_url": webhook_url,
        "commands": commands_response,
        "menu": menu_response,
        "webhook": webhook_response,
    }


async def get_telegram_webhook_info() -> dict[str, Any]:
    return await _telegram_api_post("getWebhookInfo", {})
