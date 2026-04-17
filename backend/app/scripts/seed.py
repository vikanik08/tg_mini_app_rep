from datetime import datetime, timedelta, timezone

from app.core.db import SessionLocal
from app.models.enums import EventType, PetSex, PetSpecies
from app.models.event import Event
from app.models.pet import Pet
from app.models.user import User


def run():
    db = SessionLocal()

    user = db.query(User).filter(User.telegram_id == 999999999).first()
    if not user:
        user = User(
            telegram_id=999999999,
            first_name="Alexandra",
            username="test_user",
            timezone="UTC",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    pet = db.query(Pet).filter(Pet.user_id == user.id, Pet.name == "Барсик").first()
    if not pet:
        pet = Pet(
            user_id=user.id,
            name="Барсик",
            species=PetSpecies.CAT,
            sex=PetSex.MALE,
            weight_kg=4.2,
        )
        db.add(pet)
        db.commit()
        db.refresh(pet)

    exists = db.query(Event).filter(Event.pet_id == pet.id).first()
    if not exists:
        db.add_all(
            [
                Event(
                    user_id=user.id,
                    pet_id=pet.id,
                    type=EventType.VACCINE,
                    title="Прививка",
                    scheduled_at=datetime.now(timezone.utc) + timedelta(days=3),
                    notes="Плановая вакцинация",
                ),
                Event(
                    user_id=user.id,
                    pet_id=pet.id,
                    type=EventType.VET_VISIT,
                    title="Осмотр у ветеринара",
                    scheduled_at=datetime.now(timezone.utc) + timedelta(days=10),
                    notes="Контрольный визит",
                ),
            ]
        )
        db.commit()

    db.close()
    print("Seed completed")


if __name__ == "__main__":
    run()