from pydantic import BaseModel, Field


class UserUpdate(BaseModel):
    timezone: str | None = Field(default=None, min_length=1, max_length=64)
