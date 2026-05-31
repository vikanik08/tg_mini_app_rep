let telegramScriptLoadStarted = false;

function loadTelegramScript() {
  if (telegramScriptLoadStarted || window.Telegram?.WebApp) return;

  telegramScriptLoadStarted = true;

  const script = document.createElement("script");
  script.src = "https://telegram.org/js/telegram-web-app.js";
  script.async = true;
  document.head.appendChild(script);
}

export function getTelegramInitData() {
  const fromWebApp = window.Telegram?.WebApp?.initData;
  if (fromWebApp) return fromWebApp;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  return hashParams.get("tgWebAppData") || searchParams.get("tgWebAppData") || "";
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
