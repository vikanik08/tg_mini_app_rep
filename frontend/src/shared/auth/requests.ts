import axios from "axios";

export type AuthUser = {
  id: string;
  telegram_id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  timezone: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: AuthUser;
};

const authApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function devLogin(telegramId: number) {
  const response = await authApi.post<AuthResponse>(
    `/dev/login?telegram_id=${telegramId}`,
  );
  return response.data;
}

export async function telegramLogin(initData: string) {
  const response = await authApi.post<AuthResponse>("/auth/telegram", {
    init_data: initData,
  });
  return response.data;
}
