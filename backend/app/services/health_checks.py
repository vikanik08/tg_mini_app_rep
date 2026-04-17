import uuid

from sqlalchemy.orm import Session

from app.models.health_check import HealthCheck
from app.models.pet import Pet
from app.models.user import User
from app.schemas.health_check import HealthCheckCreate


def list_health_checks(
    db: Session,
    user: User,
    pet_id: uuid.UUID | None = None,
) -> list[HealthCheck]:
    query = db.query(HealthCheck).filter(HealthCheck.user_id == user.id)

    if pet_id:
        query = query.filter(HealthCheck.pet_id == pet_id)

    return query.order_by(HealthCheck.checked_at.desc()).all()


def create_health_check(db: Session, user: User, payload: HealthCheckCreate) -> HealthCheck:
    pet = db.query(Pet).filter(Pet.id == payload.pet_id, Pet.user_id == user.id).first()
    if not pet:
        raise ValueError("Pet not found")

    health_check = HealthCheck(
        user_id=user.id,
        **payload.model_dump(),
    )
    db.add(health_check)
    db.commit()
    db.refresh(health_check)
    return health_check
