import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.pet import PetCreate, PetResponse, PetUpdate
from app.services.pets import create_pet, delete_pet, get_pet_by_id, list_pets, update_pet

router = APIRouter(prefix="/pets", tags=["pets"])


@router.get("", response_model=list[PetResponse])
def get_pets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_pets(db, current_user)


@router.post("", response_model=PetResponse, status_code=status.HTTP_201_CREATED)
def create_pet_route(
    payload: PetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return create_pet(db, current_user, payload)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e


@router.get("/{pet_id}", response_model=PetResponse)
def get_pet(
    pet_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pet = get_pet_by_id(db, current_user, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet


@router.patch("/{pet_id}", response_model=PetResponse)
def update_pet_route(
    pet_id: uuid.UUID,
    payload: PetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pet = get_pet_by_id(db, current_user, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return update_pet(db, pet, payload)


@router.delete("/{pet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pet_route(
    pet_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pet = get_pet_by_id(db, current_user, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    delete_pet(db, pet)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
