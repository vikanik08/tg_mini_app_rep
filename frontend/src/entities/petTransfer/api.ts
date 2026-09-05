import { api } from "@/shared/api/client";
import type { Pet } from "@/entities/pet/api";

export type PetTransfer = {
  token: string;
  status: "pending" | "accepted" | "cancelled" | "expired";
  pet_id: string;
  pet_name: string;
  pet_species: Pet["species"];
  from_user_name: string | null;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  cancelled_at: string | null;
};

const telegramBotUsername = "SmartPetHelper_bot";
const vkAppId = "54599546";

export function buildPetTransferLinks(token: string) {
  const encodedToken = encodeURIComponent(token);

  return {
    telegram: `https://t.me/${telegramBotUsername}?startapp=transfer_${encodedToken}`,
    vk: `https://vk.ru/app${vkAppId}#transfer=${encodedToken}`,
    web: `${window.location.origin}/transfer/${encodedToken}`,
  };
}

export async function createPetTransfer(petId: string) {
  const response = await api.post<PetTransfer>(`/pet-transfers/pets/${petId}`);
  return response.data;
}

export async function getPetTransfer(token: string) {
  const response = await api.get<PetTransfer>(`/pet-transfers/${token}`);
  return response.data;
}

export async function acceptPetTransfer(token: string) {
  const response = await api.post<PetTransfer>(`/pet-transfers/${token}/accept`);
  return response.data;
}

export async function cancelPetTransfer(token: string) {
  const response = await api.post<PetTransfer>(`/pet-transfers/${token}/cancel`);
  return response.data;
}
