let telegramScriptLoadStarted = false;

function loadTelegramScript() {
  if (telegramScriptLoadStarted || window.Telegram?.WebApp) return;

  telegramScriptLoadStarted = true;

  const script = document.createElement("script");
  script.src = "https://telegram.org/js/telegram-web-app.js";
  script.async = true;
  document.head.appendChild(script);
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeParamSource(value: string) {
  return value.replace(/^[?#]/, "").replace(/^\/+/, "");
}

function buildParamSourceCandidates(value: string) {
  const normalized = normalizeParamSource(value);
  const decodedOnce = safeDecode(normalized);
  const decodedTwice = safeDecode(decodedOnce);

  return Array.from(new Set([normalized, decodedOnce, decodedTwice]));
}

function looksLikeTelegramInitData(value: string) {
  const params = new URLSearchParams(value);
  return Boolean(params.get("hash") && params.get("user"));
}

function readTelegramInitDataFrom(value: string) {
  for (const candidate of buildParamSourceCandidates(value)) {
    const params = new URLSearchParams(candidate);
    const initData = params.get("tgWebAppData");

    if (initData) {
      const decodedInitData = safeDecode(initData);
      return looksLikeTelegramInitData(decodedInitData) ? decodedInitData : initData;
    }

    if (looksLikeTelegramInitData(candidate)) {
      return candidate;
    }
  }

  return "";
}

export function getTelegramInitData() {
  const fromWebApp = window.Telegram?.WebApp?.initData;
  if (fromWebApp) return fromWebApp;

  return (
    readTelegramInitDataFrom(window.location.hash)
    || readTelegramInitDataFrom(window.location.search)
  );
}

export function hasTelegramContext() {
  const webApp = window.Telegram?.WebApp;
  const platform = webApp?.platform?.toLowerCase();

  return Boolean(
    getTelegramInitData()
      || (webApp && platform && platform !== "unknown"),
  );
}

export async function waitForTelegramInitData() {
  const maxAttempts = 20;
  loadTelegramScript();

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const initData = getTelegramInitData();
    if (initData) return initData;

    await new Promise((resolve) => {
      window.setTimeout(resolve, 100);
    });
  }

  return "";
}

export function initTelegramPlatform() {
  loadTelegramScript();

  const tg = window.Telegram?.WebApp;
  if (!tg) return;

  tg.ready();
  tg.expand();
}

export function openTelegramLink(url: string) {
  const openLink = window.Telegram?.WebApp?.openTelegramLink;
  if (openLink) {
    openLink(url);
    return;
  }

  window.location.href = url;
}
