import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.pet_transfer import PetTransferResponse
from app.services.pet_transfers import (
    accept_pet_transfer,
    cancel_pet_transfer,
    create_pet_transfer,
    get_active_pet_transfer,
    serialize_pet_transfer,
)

router = APIRouter(prefix="/pet-transfers", tags=["pet-transfers"])


@router.post("/pets/{pet_id}", response_model=PetTransferResponse)
def create_pet_transfer_route(
    pet_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        transfer = create_pet_transfer(db, current_user, pet_id)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e

    return serialize_pet_transfer(transfer)


@router.get("/{token}", response_model=PetTransferResponse)
def get_pet_transfer_route(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        transfer = get_active_pet_transfer(db, token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e

    return serialize_pet_transfer(transfer)


@router.post("/{token}/accept", response_model=PetTransferResponse)
def accept_pet_transfer_route(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        transfer = accept_pet_transfer(db, current_user, token)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e

    return serialize_pet_transfer(transfer)


@router.post("/{token}/cancel", response_model=PetTransferResponse)
def cancel_pet_transfer_route(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        transfer = cancel_pet_transfer(db, current_user, token)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e

    return serialize_pet_transfer(transfer)
