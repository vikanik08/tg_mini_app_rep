import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import "./index.css";
import { initAnalytics, trackEvent, trackPageView } from "./shared/analytics/metrica";
import { bootstrapAuth } from "./shared/auth/bootstrap";
import { detectRuntimePlatform, getPlatformDisplayName, initPlatform } from "./shared/platform";
import { AppProviders } from "./app/providers";
import {
  buildTelegramAccountCopyLink,
  buildTelegramPromoLink,
  buildTelegramTransferLink,
  buildVkAccountCopyLink,
  buildVkPromoLink,
  buildVkTransferLink,
  consumeLaunchAccountCopyToken,
  consumeLaunchTransferToken,
  getLaunchPromoCode,
  rememberLaunchAccountCopyToken,
  rememberLaunchTransferToken,
} from "./shared/promo/promo";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found");
}

const root = createRoot(rootElement);
const appBuild = "account-copy-20261001-1";

function hasLaunchMarker(value: string) {
  const rawValue = value.replace(/^[?#]/, "");

  try {
    const decodedValue = decodeURIComponent(rawValue);
    return /(?:^|[?&#/])(?:vk_|sign=|tgWebAppData=|hash=)/i.test(decodedValue);
  } catch {
    return /(?:^|[?&#/])(?:vk_|sign=|tgWebAppData=|hash=)/i.test(rawValue);
  }
}

async function renderApp() {
  const { router } = await import("./app/router");

  root.render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  );
}

function renderBootError(message: string) {
  const isTelegramInitDataMissing = message.includes("Telegram initData");
  const isVkLaunchParamsMissing = message.includes("VK launch params");
  const isPlatformLaunchParamsMissing = message.includes("Platform launch params");
  const runtimePlatform = detectRuntimePlatform();
  const platformName = getPlatformDisplayName(runtimePlatform);
  const promoCode = getLaunchPromoCode();
  const telegramPromoLink = buildTelegramPromoLink(promoCode);
  const canOpenPromoInTelegram = runtimePlatform === "browser" && Boolean(promoCode);
  const showLaunchDebug = isTelegramInitDataMissing
    || isVkLaunchParamsMissing
    || isPlatformLaunchParamsMissing;
  trackPageView("/boot-error", {
    reason:
      isTelegramInitDataMissing
        ? "telegram_init_missing"
        : isVkLaunchParamsMissing
          ? "vk_launch_params_missing"
          : isPlatformLaunchParamsMissing
            ? "platform_launch_params_missing"
            : "bootstrap_error",
  });
  trackEvent("boot_error", {
    telegram_init_missing: isTelegramInitDataMissing,
    vk_launch_params_missing: isVkLaunchParamsMissing,
    platform_launch_params_missing: isPlatformLaunchParamsMissing,
    runtime_platform: runtimePlatform,
    message,
  });
  const telegramWebApp = window.Telegram?.WebApp;
  const debugInfo = showLaunchDebug
    ? [
        `Build: ${appBuild}`,
        `Detected platform: ${getPlatformDisplayName(runtimePlatform)}`,
        `Telegram object: ${window.Telegram ? "yes" : "no"}`,
        `WebApp object: ${telegramWebApp ? "yes" : "no"}`,
        `Platform: ${telegramWebApp?.platform || "unknown"}`,
        `Version: ${telegramWebApp?.version || "unknown"}`,
        `Search launch params: ${hasLaunchMarker(window.location.search) ? "yes" : "no"}`,
        `Hash launch params: ${hasLaunchMarker(window.location.hash) ? "yes" : "no"}`,
        `Search length: ${window.location.search.length}`,
        `Hash length: ${window.location.hash.length}`,
      ].join("\n")
    : message;

  root.render(
    <StrictMode>
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "var(--color-bg)",
          color: "var(--color-text)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "430px",
            background: "var(--color-white)",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "var(--shadow-soft)",
            display: "grid",
            gap: "12px",
          }}
        >
          <div style={{ font: "var(--font-24)" }}>Приложение не запустилось</div>
          <div style={{ font: "var(--font-14)", color: "var(--color-grey-text)" }}>
            {canOpenPromoInTelegram
              ? "Бесплатный Premium оформляется внутри Telegram mini app. Открой ссылку через Telegram, чтобы мы смогли узнать пользователя и активировать промокод."
              : isTelegramInitDataMissing
              ? "Открой mini app через кнопку приложения в Telegram, а не как обычную ссылку в браузере."
              : isVkLaunchParamsMissing
                ? `Открой mini app из ${platformName}, чтобы приложение получило launch params.`
                : isPlatformLaunchParamsMissing
                  ? "Открой mini app через кнопку приложения внутри Telegram или VK, а не как обычную ссылку в браузере."
                : "Скорее всего, frontend не смог подключиться к backend или авторизации."}
          </div>
          <code
            style={{
              whiteSpace: "pre-wrap",
              font: "var(--font-12)",
              background: "#f8f4fb",
              padding: "12px",
              borderRadius: "16px",
            }}
          >
            {debugInfo}
          </code>
          {canOpenPromoInTelegram ? (
            <a
              href={telegramPromoLink}
              style={{
                minHeight: "44px",
                borderRadius: "999px",
                background: "var(--color-purple)",
                color: "var(--color-text)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                font: "var(--font-16)",
              }}
            >
              Открыть в Telegram
            </a>
          ) : null}
          <div style={{ font: "var(--font-12)", color: "var(--color-grey-text)" }}>
            {canOpenPromoInTelegram
              ? "Если Telegram не открылся автоматически, скопируй эту страницу в Telegram или используй QR с Telegram-ссылкой."
              : isTelegramInitDataMissing
              ? "Если ты уже открыла через BotFather menu button, проверь, что туда вставлена последняя ссылка приложения."
              : isVkLaunchParamsMissing
                ? "Проверь, что в настройках VK Mini App указан правильный URL и backend знает VK_APP_ID/VK_APP_SECRET."
                : isPlatformLaunchParamsMissing
                  ? "Если открываешь из VK, поставь в настройках VK Mini App URL с параметром ?v=4 и полностью перезапусти VK."
                : "Проверь backend URL, CORS и переменные окружения фронтенда."}
          </div>
        </div>
      </div>
    </StrictMode>,
  );
}

function renderPromoOpenOptions(code: string) {
  const telegramLink = buildTelegramPromoLink(code);
  const vkLink = buildVkPromoLink(code);

  trackPageView(`/promo/${encodeURIComponent(code)}${window.location.search}${window.location.hash}`, {
    screen: "promo_open_options",
    promo_code: code,
    source: "browser",
  });

  root.render(
    <StrictMode>
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "var(--color-bg)",
          color: "var(--color-text)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "430px",
            background: "var(--color-white)",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "var(--shadow-soft)",
            display: "grid",
            gap: "14px",
          }}
        >
          <div style={{ font: "var(--font-24)" }}>Бесплатный доступ</div>
          <div style={{ font: "var(--font-14)", color: "var(--color-grey-text)" }}>
            Откройте SmartPet Helper внутри Telegram или VK, чтобы приложение
            определило ваш аккаунт и активировало промокод.
          </div>
          <a
            href={telegramLink}
            onClick={() => {
              trackEvent("promo_open_platform_clicked", {
                platform: "telegram",
                promo_code: code,
              });
            }}
            style={{
              minHeight: "44px",
              borderRadius: "999px",
              background: "var(--color-purple)",
              color: "var(--color-text)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              font: "var(--font-16)",
            }}
          >
            Открыть в Telegram
          </a>
          <a
            href={vkLink}
            onClick={() => {
              trackEvent("promo_open_platform_clicked", {
                platform: "vk",
                promo_code: code,
              });
            }}
            style={{
              minHeight: "44px",
              borderRadius: "999px",
              border: "1px solid rgba(41, 31, 58, 0.14)",
              color: "var(--color-text)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              font: "var(--font-16)",
            }}
          >
            Открыть во VK
          </a>
        </div>
      </div>
    </StrictMode>,
  );
}

function renderTransferOpenOptions(token: string) {
  const telegramLink = buildTelegramTransferLink(token);
  const vkLink = buildVkTransferLink(token);

  trackPageView("/transfer-open-options", {
    screen: "transfer_open_options",
    source: "browser",
  });

  root.render(
    <StrictMode>
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "var(--color-bg)",
          color: "var(--color-text)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "430px",
            background: "var(--color-white)",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "var(--shadow-soft)",
            display: "grid",
            gap: "14px",
          }}
        >
          <div style={{ font: "var(--font-24)" }}>Передача питомца</div>
          <div style={{ font: "var(--font-14)", color: "var(--color-grey-text)" }}>
            Откройте ссылку в том аккаунте Telegram или VK, куда нужно принять питомца.
            Обычный браузер не может определить владельца аккаунта.
          </div>
          <a
            href={telegramLink}
            style={{
              minHeight: "44px",
              borderRadius: "999px",
              background: "var(--color-purple)",
              color: "var(--color-text)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              font: "var(--font-16)",
            }}
          >
            Открыть в Telegram
          </a>
          <a
            href={vkLink}
            style={{
              minHeight: "44px",
              borderRadius: "999px",
              border: "1px solid rgba(41, 31, 58, 0.14)",
              color: "var(--color-text)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              font: "var(--font-16)",
            }}
          >
            Открыть во VK
          </a>
          <div style={{ font: "var(--font-12)", color: "var(--color-grey-text)" }}>
            Если ссылку открыл заводчик, ее нужно переслать новому владельцу. Принимать
            питомца должен новый владелец со своего аккаунта.
          </div>
        </div>
      </div>
    </StrictMode>,
  );
}

function renderAccountCopyOpenOptions(token: string) {
  const telegramLink = buildTelegramAccountCopyLink(token);
  const vkLink = buildVkAccountCopyLink(token);

  trackPageView("/account-copy-open-options", {
    screen: "account_copy_open_options",
    source: "browser",
  });

  root.render(
    <StrictMode>
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "var(--color-bg)",
          color: "var(--color-text)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "430px",
            background: "var(--color-white)",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "var(--shadow-soft)",
            display: "grid",
            gap: "14px",
          }}
        >
          <div style={{ font: "var(--font-24)" }}>Копирование данных</div>
          <div style={{ font: "var(--font-14)", color: "var(--color-grey-text)" }}>
            Откройте ссылку в мини-приложении другой платформы. Например, если
            ссылка создана во VK, откройте её в Telegram. Исходные данные не
            удалятся.
          </div>
          <a
            href={telegramLink}
            style={{
              minHeight: "44px",
              borderRadius: "999px",
              background: "var(--color-purple)",
              color: "var(--color-text)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              font: "var(--font-16)",
            }}
          >
            Открыть в Telegram
          </a>
          <a
            href={vkLink}
            style={{
              minHeight: "44px",
              borderRadius: "999px",
              border: "1px solid rgba(41, 31, 58, 0.14)",
              color: "var(--color-text)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              font: "var(--font-16)",
            }}
          >
            Открыть во VK
          </a>
          <div style={{ font: "var(--font-12)", color: "var(--color-grey-text)" }}>
            Ссылка одноразовая. Копирование доступно на любом тарифе.
          </div>
        </div>
      </div>
    </StrictMode>,
  );
}

async function startApp() {
  initAnalytics();
  trackPageView(`${window.location.pathname}${window.location.search}${window.location.hash}`, {
    screen: "boot",
    source: "startup",
  });

  const runtimePlatform = detectRuntimePlatform();
  const launchAccountCopyToken = rememberLaunchAccountCopyToken();

  if (runtimePlatform === "browser" && launchAccountCopyToken) {
    renderAccountCopyOpenOptions(launchAccountCopyToken);
    return;
  }

  const launchTransferToken = rememberLaunchTransferToken();

  if (runtimePlatform === "browser" && launchTransferToken) {
    renderTransferOpenOptions(launchTransferToken);
    return;
  }

  const launchPromoCode = getLaunchPromoCode();
  if (runtimePlatform === "browser" && launchPromoCode) {
    renderPromoOpenOptions(launchPromoCode);
    return;
  }

  await initPlatform();
  await bootstrapAuth();
  const accountCopyToken = consumeLaunchAccountCopyToken();
  if (
    accountCopyToken
    && window.location.pathname !== `/account-copy/${accountCopyToken}`
  ) {
    window.history.replaceState(
      null,
      "",
      `/account-copy/${encodeURIComponent(accountCopyToken)}`,
    );
  }
  const transferToken = consumeLaunchTransferToken();
  if (transferToken && window.location.pathname !== `/transfer/${transferToken}`) {
    window.history.replaceState(null, "", `/transfer/${encodeURIComponent(transferToken)}`);
  }
  trackEvent("app_open");
  trackEvent("app_opened", { platform: runtimePlatform });
  await renderApp();
}

void startApp().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown bootstrap error";
  renderBootError(message);
});
