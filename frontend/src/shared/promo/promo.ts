import { getTelegramInitData } from "@/shared/platform/telegram";

const promoParamNames = ["promo", "tgWebAppStartParam", "start_param", "startapp"];
const telegramBotUsername = "SmartPetHelper_bot";

function readFromParams(value: string) {
  const params = new URLSearchParams(value.replace(/^[?#]/, ""));

  for (const paramName of promoParamNames) {
    const promoCode = params.get(paramName);
    if (promoCode) return promoCode;
  }

  return "";
}

export function getLaunchPromoCode() {
  const fromWebApp = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (fromWebApp) return fromWebApp;

  const fromTelegramInitData = readFromParams(getTelegramInitData());
  if (fromTelegramInitData) return fromTelegramInitData;

  return readFromParams(window.location.search) || readFromParams(window.location.hash);
}

export function buildTelegramPromoLink(code = getLaunchPromoCode()) {
  const query = code ? `?startapp=${encodeURIComponent(code)}` : "?startapp";
  return `https://t.me/${telegramBotUsername}${query}`;
}
