import axios from "axios";
import { devLogin } from "@/shared/auth/requests";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let devSessionRefreshPromise: Promise<string | null> | null = null;

async function refreshDevSession() {
  if (!devSessionRefreshPromise) {
    devSessionRefreshPromise = (async () => {
      const telegramId = Number(import.meta.env.VITE_DEV_TELEGRAM_ID || "999999999");
      const data = await devLogin(telegramId);

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("current_user", JSON.stringify(data.user));

      return data.access_token;
    })().finally(() => {
      devSessionRefreshPromise = null;
    });
  }

  return devSessionRefreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as
      | ({ _retryDevLogin?: boolean; url?: string } & Record<string, unknown>)
      | undefined;

    const useDevLogin = import.meta.env.VITE_USE_DEV_LOGIN === "true";
    const isUnauthorized = error.response?.status === 401;
    const isDevLoginRequest = typeof originalRequest?.url === "string"
      && originalRequest.url.includes("/dev/login");

    if (
      useDevLogin
      && isUnauthorized
      && originalRequest
      && !originalRequest._retryDevLogin
      && !isDevLoginRequest
    ) {
      originalRequest._retryDevLogin = true;

      const token = await refreshDevSession();
      if (token) {
        originalRequest.headers = {
          ...(originalRequest.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${token}`,
        };
      }

      return api(originalRequest);
    }

    return Promise.reject(error);
  },
);
