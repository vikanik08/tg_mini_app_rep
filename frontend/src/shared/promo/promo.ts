import { getTelegramInitData } from "@/shared/platform/telegram";

const promoParamNames = ["promo", "tgWebAppStartParam", "start_param", "startapp"];
const launchParamNames = ["tgWebAppStartParam", "start_param", "startapp"];
const telegramBotUsername = "SmartPetHelper_bot";
const transferPrefix = "transfer_";

function readFromParams(value: string, paramNames: string[]) {
  const params = new URLSearchParams(value.replace(/^[?#]/, ""));

  for (const paramName of paramNames) {
    const paramValue = params.get(paramName);
    if (paramValue) return paramValue;
  }

  return "";
}

function normalizePromoCode(value: string) {
  return value.startsWith(transferPrefix) ? "" : value;
}

function normalizeTransferToken(value: string) {
  if (!value) return "";
  return value.startsWith(transferPrefix) ? value.slice(transferPrefix.length) : value;
}

export function getLaunchPromoCode() {
  const fromWebApp = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (fromWebApp) return normalizePromoCode(fromWebApp);

  const fromTelegramInitData = readFromParams(getTelegramInitData(), promoParamNames);
  if (fromTelegramInitData) return normalizePromoCode(fromTelegramInitData);

  return normalizePromoCode(
    readFromParams(window.location.search, promoParamNames)
      || readFromParams(window.location.hash, promoParamNames),
  );
}

export function getLaunchTransferToken() {
  const fromWebApp = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (fromWebApp?.startsWith(transferPrefix)) return normalizeTransferToken(fromWebApp);

  const fromTelegramInitData = readFromParams(getTelegramInitData(), launchParamNames);
  if (fromTelegramInitData?.startsWith(transferPrefix)) {
    return normalizeTransferToken(fromTelegramInitData);
  }

  const directSearchTransfer = readFromParams(window.location.search, ["transfer"]);
  if (directSearchTransfer) return normalizeTransferToken(directSearchTransfer);

  const directHashTransfer = readFromParams(window.location.hash, ["transfer"]);
  if (directHashTransfer) return normalizeTransferToken(directHashTransfer);

  const launchSearchTransfer = readFromParams(window.location.search, launchParamNames);
  if (launchSearchTransfer?.startsWith(transferPrefix)) {
    return normalizeTransferToken(launchSearchTransfer);
  }

  const launchHashTransfer = readFromParams(window.location.hash, launchParamNames);
  return launchHashTransfer?.startsWith(transferPrefix)
    ? normalizeTransferToken(launchHashTransfer)
    : "";
}

export function buildTelegramPromoLink(code = getLaunchPromoCode()) {
  const query = code ? `?startapp=${encodeURIComponent(code)}` : "?startapp";
  return `https://t.me/${telegramBotUsername}${query}`;
}
