from sqlalchemy.orm import Session

from app.models.pet import Pet
from app.models.user import User
from app.schemas.pet import PetCreate, PetUpdate
from app.services.subscriptions import assert_can_create_pet


def _legacy_reproductive_status(is_neutered: bool, sex) -> str:
    if not is_neutered:
        return "none"
    return "sterilization" if sex.value == "female" else "castration"


def list_pets(db: Session, user: User) -> list[Pet]:
    return db.query(Pet).filter(Pet.user_id == user.id).order_by(Pet.created_at.desc()).all()


def create_pet(db: Session, user: User, payload: PetCreate) -> Pet:
    assert_can_create_pet(db, user)
    reproductive_status = payload.reproductive_status
    if reproductive_status == "none" and payload.is_neutered:
        reproductive_status = _legacy_reproductive_status(payload.is_neutered, payload.sex)

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
        is_neutered=reproductive_status != "none",
        reproductive_status=reproductive_status,
        is_vaccinated=payload.is_vaccinated,
        vaccination_date=payload.vaccination_date,
        vaccination_type=payload.vaccination_type,
        vaccination_product=payload.vaccination_product,
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

    if update_data.get("reproductive_status") is not None:
        update_data["is_neutered"] = update_data["reproductive_status"] != "none"
    elif "is_neutered" in update_data:
        next_sex = update_data.get("sex", pet.sex)
        update_data["reproductive_status"] = _legacy_reproductive_status(
            update_data["is_neutered"],
            next_sex,
        )

    for field, value in update_data.items():
        setattr(pet, field, value)

    db.commit()
    db.refresh(pet)
    return pet


def delete_pet(db: Session, pet: Pet) -> None:
    db.delete(pet)
    db.commit()
