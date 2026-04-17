from sqlalchemy.orm import Session

from app.models.pet import Pet
from app.models.user import User
from app.schemas.pet import PetCreate, PetUpdate


def list_pets(db: Session, user: User) -> list[Pet]:
    return db.query(Pet).filter(Pet.user_id == user.id).order_by(Pet.created_at.desc()).all()


def create_pet(db: Session, user: User, payload: PetCreate) -> Pet:
    pet = Pet(
        user_id=user.id,
        name=payload.name,
        species=payload.species,
        sex=payload.sex,
        birthdate=payload.birthdate,
        weight_kg=payload.weight_kg,
        photo_url=payload.photo_url,
        species_label=payload.species_label,
        breed=payload.breed,
        color=payload.color,
        is_neutered=payload.is_neutered,
        is_vaccinated=payload.is_vaccinated,
        vaccination_date=payload.vaccination_date,
        has_parasite_treatment=payload.has_parasite_treatment,
        flea_treatment_date=payload.flea_treatment_date,
        worm_treatment_date=payload.worm_treatment_date,
        flea_treatment_product=payload.flea_treatment_product,
        worm_treatment_product=payload.worm_treatment_product,
        has_chronic_conditions=payload.has_chronic_conditions,
        chronic_conditions_notes=payload.chronic_conditions_notes,
        had_surgeries=payload.had_surgeries,
        surgeries_notes=payload.surgeries_notes,
        has_microchip=payload.has_microchip,
        microchip_number=payload.microchip_number,
    )
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return pet


def get_pet_by_id(db: Session, user: User, pet_id) -> Pet | None:
    return db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == user.id).first()


def update_pet(db: Session, pet: Pet, payload: PetUpdate) -> Pet:
    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(pet, field, value)

    db.commit()
    db.refresh(pet)
    return pet


def delete_pet(db: Session, pet: Pet) -> None:
    db.delete(pet)
    db.commit()
