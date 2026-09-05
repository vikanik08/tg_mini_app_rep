import { api } from "@/shared/api/client";
import { normalizeAuthUser, type AuthUser } from "@/shared/auth/requests";

export type UpdateCurrentUserPayload = {
  timezone?: string;
};

export type UpdateVkMessagesPayload = {
  enabled: boolean;
};

export async function getCurrentUser() {
  const response = await api.get<AuthUser>("/users/me");
  return normalizeAuthUser(response.data);
}

export async function updateCurrentUser(payload: UpdateCurrentUserPayload) {
  const response = await api.patch<AuthUser>("/users/me", payload);
  return normalizeAuthUser(response.data);
}

export async function updateVkMessages(payload: UpdateVkMessagesPayload) {
  const response = await api.post<AuthUser>("/users/me/vk-messages", payload);
  return normalizeAuthUser(response.data);
}
