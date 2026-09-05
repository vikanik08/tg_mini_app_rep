import axios from "axios";
import type { AuthPlatform } from "@/shared/platform/types";

export type AuthUser = {
  id: string;
  telegram_id: number | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  timezone: string;
  subscription_plan: "basic" | "premium" | "family" | "breeder";
  subscription_expires_at: string | null;
  last_seen_at?: string | null;
  platform: AuthPlatform;
  platform_user_id: string | null;
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: AuthUser;
};

type RawAuthUser = Omit<AuthUser, "platform" | "platform_user_id" | "telegram_id"> & {
  telegram_id?: number | null;
  platform?: AuthPlatform;
  platform_user_id?: string | null;
};

type RawAuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: RawAuthUser;
};

const authApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export function normalizeAuthUser(
  user: RawAuthUser,
  platformOverride?: AuthPlatform,
): AuthUser {
  const telegramId =
    typeof user.telegram_id === "number" ? user.telegram_id : null;
  const platform =
    user.platform ?? platformOverride ?? (telegramId !== null ? "telegram" : "dev");
  const platformUserId =
    user.platform_user_id ?? (telegramId !== null ? String(telegramId) : null);

  return {
    ...user,
    telegram_id: telegramId,
    platform,
    platform_user_id: platformUserId,
  };
}

function normalizeAuthResponse(
  response: RawAuthResponse,
  platformOverride?: AuthPlatform,
): AuthResponse {
  return {
    ...response,
    user: normalizeAuthUser(response.user, platformOverride),
  };
}

export async function devLogin(telegramId: number) {
  const response = await authApi.post<RawAuthResponse>(
    `/dev/login?telegram_id=${telegramId}`,
  );
  return normalizeAuthResponse(response.data, "dev");
}

export async function telegramLogin(initData: string) {
  const response = await authApi.post<RawAuthResponse>("/auth/telegram", {
    init_data: initData,
  });
  return normalizeAuthResponse(response.data, "telegram");
}

export async function vkLogin(launchParams: string) {
  const response = await authApi.post<RawAuthResponse>("/auth/vk", {
    launch_params: launchParams,
  });
  return normalizeAuthResponse(response.data, "vk");
}
