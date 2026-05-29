import { api } from "@/shared/api/client";
import { normalizeAuthUser, type AuthUser } from "@/shared/auth/requests";

export type UpdateCurrentUserPayload = {
  timezone?: string;
};

export async function getCurrentUser() {
  const response = await api.get<AuthUser>("/users/me");
  return normalizeAuthUser(response.data);
}

export async function updateCurrentUser(payload: UpdateCurrentUserPayload) {
  const response = await api.patch<AuthUser>("/users/me", payload);
  return normalizeAuthUser(response.data);
}
