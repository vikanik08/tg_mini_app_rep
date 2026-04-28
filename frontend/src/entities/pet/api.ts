import { api } from "@/shared/api/client";
import { trackEvent } from "@/shared/analytics/metrica";

export type Pet = {
  id: string;
  user_id: string;
  name: string;
  species: "cat" | "dog" | "other";
  sex: "male" | "female" | "unknown";
  birthdate: string | null;
  weight_kg: string | null;
  photo_url: string | null;
  species_label: string | null;
  breed: string | null;
  color: string | null;
  is_neutered: boolean;
  is_vaccinated: boolean;
  vaccination_date: string | null;
  has_parasite_treatment: boolean;
  flea_treatment_date: string | null;
  worm_treatment_date: string | null;
  flea_treatment_product: string | null;
  worm_treatment_product: string | null;
  has_chronic_conditions: boolean;
  chronic_conditions_notes: string | null;
  had_surgeries: boolean;
  surgeries_notes: string | null;
  has_microchip: boolean;
  microchip_number: string | null;
  created_at: string;
};

export type CreatePetPayload = {
  name: string;
  species: "cat" | "dog" | "other";
  sex?: "male" | "female" | "unknown";
  birthdate?: string | null;
  weight_kg?: number | null;
  photo_url?: string | null;
  species_label?: string | null;
  breed?: string | null;
  color?: string | null;
  is_neutered?: boolean;
  is_vaccinated?: boolean;
  vaccination_date?: string | null;
  has_parasite_treatment?: boolean;
  flea_treatment_date?: string | null;
  worm_treatment_date?: string | null;
  flea_treatment_product?: string | null;
  worm_treatment_product?: string | null;
  has_chronic_conditions?: boolean;
  chronic_conditions_notes?: string | null;
  had_surgeries?: boolean;
  surgeries_notes?: string | null;
  has_microchip?: boolean;
  microchip_number?: string | null;
};

export type UpdatePetPayload = Partial<CreatePetPayload>;

export async function getPets() {
  const response = await api.get<Pet[]>("/pets");
  return response.data;
}

export async function getPetById(petId: string) {
  const response = await api.get<Pet>(`/pets/${petId}`);
  return response.data;
}

export async function createPet(payload: CreatePetPayload) {
  const response = await api.post<Pet>("/pets", payload);
  trackEvent("pet_created", {
    species: payload.species,
    has_photo: Boolean(payload.photo_url),
  });
  return response.data;
}

export async function updatePet(petId: string, payload: UpdatePetPayload) {
  const response = await api.patch<Pet>(`/pets/${petId}`, payload);
  trackEvent("pet_updated", {
    pet_id: petId,
    changed_species: payload.species ?? null,
  });
  return response.data;
}

export async function deletePet(petId: string) {
  await api.delete(`/pets/${petId}`);
  trackEvent("pet_deleted", { pet_id: petId });
}
