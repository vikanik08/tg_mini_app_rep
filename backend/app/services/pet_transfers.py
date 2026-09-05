import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.health_check import HealthCheck
from app.models.pet import Pet
from app.models.pet_transfer import PetTransfer
from app.models.user import User
from app.schemas.pet_transfer import PetTransferResponse
from app.services.subscriptions import assert_can_create_pet, assert_can_transfer_pet


TRANSFER_TTL_DAYS = 14


def _as_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _is_pending_and_active(transfer: PetTransfer, now: datetime) -> bool:
    return transfer.status == "pending" and _as_aware_utc(transfer.expires_at) > now


def _mark_expired_if_needed(db: Session, transfer: PetTransfer) -> None:
    if transfer.status != "pending":
        return

    if _as_aware_utc(transfer.expires_at) > datetime.now(timezone.utc):
        return

    transfer.status = "expired"
    db.commit()
    db.refresh(transfer)


def _user_name(user: User | None) -> str | None:
    if user is None:
        return None

    name = " ".join(part for part in [user.first_name, user.last_name] if part)
    return name or user.username or None


def serialize_pet_transfer(transfer: PetTransfer) -> PetTransferResponse:
    return PetTransferResponse(
        token=transfer.token,
        status=transfer.status,
        pet_id=transfer.pet_id,
        pet_name=transfer.pet.name,
        pet_species=transfer.pet.species,
        from_user_name=_user_name(transfer.from_user),
        expires_at=transfer.expires_at,
        created_at=transfer.created_at,
        accepted_at=transfer.accepted_at,
        cancelled_at=transfer.cancelled_at,
    )


def create_pet_transfer(db: Session, user: User, pet_id: uuid.UUID) -> PetTransfer:
    assert_can_transfer_pet(user)

    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == user.id).first()
    if not pet:
        raise ValueError("Pet not found")

    now = datetime.now(timezone.utc)
    existing_transfer = (
        db.query(PetTransfer)
        .filter(PetTransfer.pet_id == pet.id)
        .filter(PetTransfer.from_user_id == user.id)
        .filter(PetTransfer.status == "pending")
        .order_by(PetTransfer.created_at.desc())
        .first()
    )

    if existing_transfer and _is_pending_and_active(existing_transfer, now):
        return existing_transfer

    if existing_transfer:
        existing_transfer.status = "expired"

    transfer = PetTransfer(
        pet_id=pet.id,
        from_user_id=user.id,
        token=secrets.token_urlsafe(18),
        status="pending",
        expires_at=now + timedelta(days=TRANSFER_TTL_DAYS),
    )
    db.add(transfer)
    db.commit()
    db.refresh(transfer)
    return transfer


def get_active_pet_transfer(db: Session, token: str) -> PetTransfer:
    transfer = db.query(PetTransfer).filter(PetTransfer.token == token).first()
    if not transfer:
        raise ValueError("Transfer not found")

    _mark_expired_if_needed(db, transfer)
    if transfer.status != "pending":
        raise ValueError("Transfer is not active")

    if transfer.pet.user_id != transfer.from_user_id:
        transfer.status = "cancelled"
        transfer.cancelled_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(transfer)
        raise ValueError("Transfer is not active")

    return transfer


def accept_pet_transfer(db: Session, user: User, token: str) -> PetTransfer:
    transfer = get_active_pet_transfer(db, token)

    if transfer.from_user_id == user.id:
        raise PermissionError("Нельзя принять собственного питомца")

    assert_can_create_pet(db, user)

    now = datetime.now(timezone.utc)
    pet = transfer.pet
    old_owner_id = transfer.from_user_id

    pet.user_id = user.id
    (
        db.query(Event)
        .filter(Event.pet_id == pet.id)
        .filter(Event.user_id == old_owner_id)
        .update({Event.user_id: user.id}, synchronize_session=False)
    )
    (
        db.query(HealthCheck)
        .filter(HealthCheck.pet_id == pet.id)
        .filter(HealthCheck.user_id == old_owner_id)
        .update({HealthCheck.user_id: user.id}, synchronize_session=False)
    )
    transfer.to_user_id = user.id
    transfer.status = "accepted"
    transfer.accepted_at = now

    db.commit()
    db.refresh(transfer)
    return transfer


def cancel_pet_transfer(db: Session, user: User, token: str) -> PetTransfer:
    transfer = get_active_pet_transfer(db, token)
    if transfer.from_user_id != user.id:
        raise PermissionError("Можно отменить только свою передачу питомца")

    transfer.status = "cancelled"
    transfer.cancelled_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(transfer)
    return transfer
