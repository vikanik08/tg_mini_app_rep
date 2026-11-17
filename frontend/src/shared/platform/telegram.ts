let telegramScriptLoadStarted = false;
const telegramSdkWaitAttempts = 80;
const telegramInitDataWaitAttempts = 100;
const telegramWaitIntervalMs = 100;

function loadTelegramScript() {
  if (telegramScriptLoadStarted || window.Telegram?.WebApp) return;

  const existingScript = document.querySelector<HTMLScriptElement>(
    'script[src^="https://telegram.org/js/telegram-web-app.js"]',
  );
  if (existingScript) {
    telegramScriptLoadStarted = true;
    return;
  }

  telegramScriptLoadStarted = true;

  const script = document.createElement("script");
  script.src = "https://telegram.org/js/telegram-web-app.js";
  script.async = true;
  document.head.appendChild(script);
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

async function waitForTelegramWebApp() {
  loadTelegramScript();

  for (let attempt = 0; attempt < telegramSdkWaitAttempts; attempt += 1) {
    const webApp = window.Telegram?.WebApp;
    if (webApp) return webApp;

    await wait(telegramWaitIntervalMs);
  }

  return undefined;
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
  const webApp = await waitForTelegramWebApp();
  webApp?.ready();

  for (let attempt = 0; attempt < telegramInitDataWaitAttempts; attempt += 1) {
    const initData = getTelegramInitData();
    if (initData) return initData;

    await wait(telegramWaitIntervalMs);
  }

  return "";
}

export async function initTelegramPlatform() {
  const tg = await waitForTelegramWebApp();
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
