import axios from "axios";
import { devLogin, telegramLogin, vkLogin } from "@/shared/auth/requests";
import { getPlatformAuthContext } from "@/shared/platform";

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

let sessionRefreshPromise: Promise<string | null> | null = null;

function storeAuthSession(
  data: Awaited<ReturnType<typeof devLogin | typeof telegramLogin | typeof vkLogin>>,
) {
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("current_user", JSON.stringify(data.user));
  return data.access_token;
}

async function refreshSession() {
  if (!sessionRefreshPromise) {
    sessionRefreshPromise = (async () => {
      const authContext = await getPlatformAuthContext();

      if (authContext?.platform === "telegram") {
        return storeAuthSession(await telegramLogin(authContext.initData));
      }

      if (authContext?.platform === "vk") {
        return storeAuthSession(await vkLogin(authContext.launchParams));
      }

      if (import.meta.env.VITE_USE_DEV_LOGIN === "true") {
        const telegramId = Number(import.meta.env.VITE_DEV_TELEGRAM_ID || "999999999");
        return storeAuthSession(await devLogin(telegramId));
      }

      localStorage.removeItem("access_token");
      localStorage.removeItem("current_user");
      return null;
    })().finally(() => {
      sessionRefreshPromise = null;
    });
  }

  return sessionRefreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as
      | ({ _retryAuth?: boolean; url?: string } & Record<string, unknown>)
      | undefined;

    const isUnauthorized = error.response?.status === 401;
    const isAuthRequest = typeof originalRequest?.url === "string"
      && ["/auth/telegram", "/auth/vk", "/dev/login"].some((url) =>
        originalRequest.url?.includes(url),
      );

    if (
      isUnauthorized
      && originalRequest
      && !originalRequest._retryAuth
      && !isAuthRequest
    ) {
      originalRequest._retryAuth = true;

      const token = await refreshSession();
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
