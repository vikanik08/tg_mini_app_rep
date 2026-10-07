import { getTelegramInitData } from "@/shared/platform/telegram";

const promoParamNames = ["promo", "tgWebAppStartParam", "start_param", "startapp"];
const launchParamNames = ["tgWebAppStartParam", "start_param", "startapp"];
const telegramBotUsername = "SmartPetHelper_bot";
const vkAppId = "54599546";
const transferPrefix = "transfer_";
const transferStorageKey = "smartpet_launch_transfer_token";
const accountCopyPrefix = "accountcopy_";
const accountCopyStorageKey = "smartpet_launch_account_copy_token";

function readFromParams(value: string, paramNames: string[]) {
  const params = new URLSearchParams(value.replace(/^[?#]/, ""));

  for (const paramName of paramNames) {
    const paramValue = params.get(paramName);
    if (paramValue) return paramValue;
  }

  return "";
}

function normalizePromoCode(value: string) {
  if (value.startsWith(transferPrefix) || value.startsWith(accountCopyPrefix)) {
    return "";
  }

  if (value.startsWith("utm_")) {
    return "";
  }

  if (value.startsWith("promo_")) {
    return value.split("__", 1)[0].slice("promo_".length);
  }

  return value;
}

function normalizePrefixedToken(value: string, prefix: string) {
  if (!value) return "";
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function normalizeHashValue(value: string) {
  return value.replace(/^#/, "");
}

function readTokenFromPath(pattern: RegExp) {
  const match = window.location.pathname.match(pattern);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

function readLaunchToken(prefix: string, directParamName: string, pathPattern: RegExp) {
  const fromPath = readTokenFromPath(pathPattern);
  if (fromPath) return normalizePrefixedToken(fromPath, prefix);

  const fromWebApp = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (fromWebApp?.startsWith(prefix)) return normalizePrefixedToken(fromWebApp, prefix);

  const fromTelegramInitData = readFromParams(getTelegramInitData(), launchParamNames);
  if (fromTelegramInitData?.startsWith(prefix)) {
    return normalizePrefixedToken(fromTelegramInitData, prefix);
  }

  const directSearchValue = readFromParams(window.location.search, [directParamName]);
  if (directSearchValue) return normalizePrefixedToken(directSearchValue, prefix);

  const directHashValue = readFromParams(window.location.hash, [directParamName]);
  if (directHashValue) return normalizePrefixedToken(directHashValue, prefix);

  const rawHash = normalizeHashValue(window.location.hash);
  if (rawHash.startsWith(prefix)) return normalizePrefixedToken(rawHash, prefix);

  const launchSearchValue = readFromParams(window.location.search, launchParamNames);
  if (launchSearchValue?.startsWith(prefix)) {
    return normalizePrefixedToken(launchSearchValue, prefix);
  }

  const launchHashValue = readFromParams(window.location.hash, launchParamNames);
  return launchHashValue?.startsWith(prefix)
    ? normalizePrefixedToken(launchHashValue, prefix)
    : "";
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
  return readLaunchToken(transferPrefix, "transfer", /^\/transfer\/([^/]+)/);
}

export function getLaunchAccountCopyToken() {
  return readLaunchToken(
    accountCopyPrefix,
    "account_copy",
    /^\/account-copy\/([^/]+)/,
  );
}

export function rememberLaunchTransferToken(token = getLaunchTransferToken()) {
  if (!token) return "";

  sessionStorage.setItem(transferStorageKey, token);
  return token;
}

export function consumeLaunchTransferToken() {
  const token = getLaunchTransferToken() || sessionStorage.getItem(transferStorageKey) || "";

  sessionStorage.removeItem(transferStorageKey);

  return token;
}

export function rememberLaunchAccountCopyToken(token = getLaunchAccountCopyToken()) {
  if (!token) return "";

  sessionStorage.setItem(accountCopyStorageKey, token);
  return token;
}

export function consumeLaunchAccountCopyToken() {
  const token = getLaunchAccountCopyToken()
    || sessionStorage.getItem(accountCopyStorageKey)
    || "";

  sessionStorage.removeItem(accountCopyStorageKey);

  return token;
}

export function buildTelegramPromoLink(code = getLaunchPromoCode()) {
  const query = code ? `?startapp=${encodeURIComponent(code)}` : "?startapp";
  return `https://t.me/${telegramBotUsername}${query}`;
}

export function buildVkPromoLink(code = getLaunchPromoCode()) {
  const hash = code ? `#promo=${encodeURIComponent(code)}` : "";
  return `https://vk.ru/app${vkAppId}${hash}`;
}

export function buildTelegramTransferLink(token: string) {
  return `https://t.me/${telegramBotUsername}?start=${transferPrefix}${encodeURIComponent(token)}`;
}

export function buildVkTransferLink(token: string) {
  return `https://vk.ru/app${vkAppId}#${transferPrefix}${encodeURIComponent(token)}`;
}

export function buildTelegramAccountCopyLink(token: string) {
  return `https://t.me/${telegramBotUsername}?startapp=${accountCopyPrefix}${encodeURIComponent(token)}`;
}

export function buildVkAccountCopyLink(token: string) {
  return `https://vk.ru/app${vkAppId}#${accountCopyPrefix}${encodeURIComponent(token)}`;
}
