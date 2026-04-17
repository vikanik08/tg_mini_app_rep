from enum import Enum


class PetSpecies(str, Enum):
    CAT = "cat"
    DOG = "dog"
    OTHER = "other"


class PetSex(str, Enum):
    MALE = "male"
    FEMALE = "female"
    UNKNOWN = "unknown"


class EventType(str, Enum):
    VACCINE = "vaccine"
    FLEA_TREATMENT = "flea_treatment"
    VET_VISIT = "vet_visit"
    GROOMING = "grooming"
    OTHER = "other"