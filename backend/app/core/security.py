import hashlib
import hmac
import json
from base64 import b64encode
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qsl, urlencode

import jwt

from app.core.config import settings


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_alg)


def parse_init_data(init_data: str) -> dict[str, str]:
    return dict(parse_qsl(init_data.lstrip("?"), keep_blank_values=True))


def verify_telegram_init_data(init_data: str) -> dict:
    parsed_data = parse_init_data(init_data)

    received_hash = parsed_data.pop("hash", None)
    if not received_hash:
        raise ValueError("Missing hash in init_data")

    data_check_arr = [f"{k}={v}" for k, v in sorted(parsed_data.items())]
    data_check_string = "\n".join(data_check_arr)

    secret_key = hmac.new(
        key=b"WebAppData",
        msg=settings.telegram_bot_token.encode(),
        digestmod=hashlib.sha256,
    ).digest()

    calculated_hash = hmac.new(
        key=secret_key,
        msg=data_check_string.encode(),
        digestmod=hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise ValueError("Invalid Telegram init data hash")

    user_raw = parsed_data.get("user")
    if not user_raw:
        raise ValueError("Missing user in init_data")

    return json.loads(user_raw)


def parse_vk_launch_params(launch_params: str) -> dict[str, str]:
    return dict(parse_qsl(launch_params.lstrip("?"), keep_blank_values=True))


def verify_vk_launch_params(launch_params: str) -> dict[str, str]:
    if not settings.vk_app_secret:
        raise ValueError("VK app secret is not configured")

    parsed_data = parse_vk_launch_params(launch_params)
    received_sign = parsed_data.get("sign")
    if not received_sign:
        raise ValueError("Missing sign in VK launch params")

    if settings.vk_app_id and parsed_data.get("vk_app_id") != settings.vk_app_id:
        raise ValueError("Invalid VK app id in launch params")

    vk_subset = sorted(
        key for key in parsed_data if key.startswith("vk_")
    )
    if not vk_subset:
        raise ValueError("Missing VK launch params")

    ordered = {key: parsed_data[key] for key in vk_subset}

    hash_code = b64encode(
        hmac.new(
            settings.vk_app_secret.encode(),
            urlencode(ordered, doseq=True).encode(),
            hashlib.sha256,
        ).digest(),
    ).decode("utf-8")

    if hash_code.endswith("="):
        hash_code = hash_code[:-1]

    expected_sign = hash_code.replace("+", "-").replace("/", "_")
    if not hmac.compare_digest(expected_sign, received_sign):
        raise ValueError("Invalid VK launch params sign")

    return parsed_data
