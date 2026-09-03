from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
    )

    app_name: str = "TG MiniApp API"
    env: str = "dev"
    debug: bool = False

    database_url: str

    @field_validator("database_url", mode="after")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    jwt_secret: str
    jwt_alg: str = "HS256"
    access_token_expire_minutes: int = 60

    telegram_bot_token: str
    public_base_url: str = "https://smartpet-lunyc.amvera.io"
    telegram_mini_app_url: str = "https://smartpet-lunyc.amvera.io"
    telegram_support_url: str = "https://t.me/maiiamk"
    telegram_webhook_url: str = ""
    telegram_webhook_secret: str = ""
    vk_app_id: str = ""
    vk_app_secret: str = ""
    admin_secret: str = ""

    cors_origins: str = ""
    allow_dev_login: bool = True
    run_notification_worker: bool = True
    run_inactive_user_messages: bool = False
    inactive_user_days: int = 3
    inactive_message_cooldown_days: int = 7
    run_subscription_expiry_messages: bool = False
    subscription_expiry_notice_days: str = "3,1"
    promo_premium_code: str = "premium30"
    promo_premium_days: int = 30

    @property
    def cors_origins_list(self) -> list[str]:
        if not self.cors_origins:
            return []
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]


settings = Settings()
