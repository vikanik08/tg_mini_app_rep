import { api } from "@/shared/api/client";
import { normalizeAuthUser, type AuthUser } from "@/shared/auth/requests";

export type AdminMe = {
  is_admin: boolean;
  platform: AuthUser["platform"];
  platform_user_id: string;
};

export type AdminSubscriptionPayload = {
  plan: AuthUser["subscription_plan"];
  expires_at: string | null;
};

export async function getAdminMe() {
  const response = await api.get<AdminMe>("/admin/me");
  return response.data;
}

export async function updateOwnSubscription(payload: AdminSubscriptionPayload) {
  const response = await api.post<AuthUser>("/admin/me/subscription", payload);
  return normalizeAuthUser(response.data);
}
