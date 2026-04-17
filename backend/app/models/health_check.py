import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class HealthCheck(Base):
    __tablename__ = "health_checks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    pet_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pets.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    appetite: Mapped[int | None] = mapped_column(Integer, nullable=True)
    water: Mapped[int | None] = mapped_column(Integer, nullable=True)
    urination_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stool_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stool_consistency: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sleep_hours: Mapped[Decimal | None] = mapped_column(Numeric(4, 1), nullable=True)
    activity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vomiting: Mapped[str | None] = mapped_column(String(32), nullable=True)
    itching: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sleep_breathing: Mapped[str | None] = mapped_column(String(32), nullable=True)
    mood: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pain: Mapped[str | None] = mapped_column(String(32), nullable=True)
    cough: Mapped[str | None] = mapped_column(String(32), nullable=True)
    discharge: Mapped[str | None] = mapped_column(String(32), nullable=True)
    owner_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user = relationship("User", backref="health_checks")
    pet = relationship("Pet", backref="health_checks")
