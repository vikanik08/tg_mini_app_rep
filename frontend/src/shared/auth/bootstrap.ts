import { devLogin, telegramLogin } from "@/shared/auth/requests";

function getTelegramInitData() {
  const fromWebApp = window.Telegram?.WebApp?.initData;
  if (fromWebApp) return fromWebApp;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  return hashParams.get("tgWebAppData") || searchParams.get("tgWebAppData") || "";
}

async function waitForTelegramInitData() {
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const initData = getTelegramInitData();
    if (initData) return initData;

    await new Promise((resolve) => {
      window.setTimeout(resolve, 100);
    });
  }

  return "";
}

export async function bootstrapAuth() {
  const useDevLogin = import.meta.env.VITE_USE_DEV_LOGIN === "true";

  if (useDevLogin) {
    const telegramId = Number(
      import.meta.env.VITE_DEV_TELEGRAM_ID || "999999999",
    );
    const data = await devLogin(telegramId);

    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("current_user", JSON.stringify(data.user));
    return;
  }

  const initData = await waitForTelegramInitData();

  if (initData) {
    const data = await telegramLogin(initData);

    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("current_user", JSON.stringify(data.user));
    return;
  }

  const existingToken = localStorage.getItem("access_token");
  if (existingToken) return;

  throw new Error("Telegram initData is missing");
}
