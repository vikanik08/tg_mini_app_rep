const ACTIVE_PET_KEY = "active_pet_id";

export function getActivePetId() {
  return localStorage.getItem(ACTIVE_PET_KEY);
}

export function setActivePetId(petId: string) {
  localStorage.setItem(ACTIVE_PET_KEY, petId);
}

export function clearActivePetId() {
  localStorage.removeItem(ACTIVE_PET_KEY);
}

export function pickActivePet<T extends { id: string }>(pets: T[]) {
  const activePetId = getActivePetId();

  if (activePetId) {
    const activePet = pets.find((pet) => pet.id === activePetId);
    if (activePet) return activePet;
  }

  return pets[0] ?? null;
}

export function syncActivePet(pet: { id: string } | null) {
  if (pet?.id) {
    setActivePetId(pet.id);
  } else {
    clearActivePetId();
  }
}

export function ensureActivePet(pet: { id: string } | null) {
  if (!pet?.id) return;
  if (getActivePetId()) return;
  setActivePetId(pet.id);
}

export function buildPassportPath(petId: string) {
  return `/passport/${petId}`;
}

export function buildPassportEditPath(petId: string) {
  return `/passport/${petId}/edit`;
}

export function buildProcedurePath(type: string, petId: string) {
  return `/procedure/${type}/${petId}`;
}

export function buildHealthCheckPath(petId: string) {
  return `/health-check/${petId}`;
}
