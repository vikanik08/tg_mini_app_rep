import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import "./index.css";
import { router } from "./app/router";
import { initAnalytics, trackEvent, trackPageView } from "./shared/analytics/metrica";
import { bootstrapAuth } from "./shared/auth/bootstrap";
import { detectRuntimePlatform, getPlatformDisplayName, initPlatform } from "./shared/platform";
import { AppProviders } from "./app/providers";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found");
}

const root = createRoot(rootElement);

function renderApp() {
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
  const runtimePlatform = detectRuntimePlatform();
  const platformName = getPlatformDisplayName(runtimePlatform);
  trackPageView("/boot-error", {
    reason:
      isTelegramInitDataMissing
        ? "telegram_init_missing"
        : isVkLaunchParamsMissing
          ? "vk_launch_params_missing"
          : "bootstrap_error",
  });
  trackEvent("boot_error", {
    telegram_init_missing: isTelegramInitDataMissing,
    vk_launch_params_missing: isVkLaunchParamsMissing,
    runtime_platform: runtimePlatform,
    message,
  });
  const telegramWebApp = window.Telegram?.WebApp;
  const debugInfo = isTelegramInitDataMissing || isVkLaunchParamsMissing
    ? [
        `Detected platform: ${getPlatformDisplayName(runtimePlatform)}`,
        `Telegram object: ${window.Telegram ? "yes" : "no"}`,
        `WebApp object: ${telegramWebApp ? "yes" : "no"}`,
        `Platform: ${telegramWebApp?.platform || "unknown"}`,
        `Version: ${telegramWebApp?.version || "unknown"}`,
        `VK launch params: ${window.location.search.includes("vk_") ? "yes" : "no"}`,
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
            {isTelegramInitDataMissing
              ? "Открой mini app через кнопку приложения в Telegram, а не как обычную ссылку в браузере."
              : isVkLaunchParamsMissing
                ? `Открой mini app из ${platformName}, чтобы приложение получило launch params.`
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
          <div style={{ font: "var(--font-12)", color: "var(--color-grey-text)" }}>
            {isTelegramInitDataMissing
              ? "Если ты уже открыла через BotFather menu button, проверь, что туда вставлена последняя Vercel-ссылка."
              : isVkLaunchParamsMissing
                ? "Проверь, что в настройках VK Mini App указан правильный URL и backend знает VK_APP_ID/VK_APP_SECRET."
                : "Проверь backend URL, CORS и переменные окружения Vercel."}
          </div>
        </div>
      </div>
    </StrictMode>,
  );
}

async function startApp() {
  initAnalytics();
  trackPageView(`${window.location.pathname}${window.location.search}`, {
    screen: "boot",
    source: "startup",
  });
  await initPlatform();
  await bootstrapAuth();
  trackEvent("app_open");
  renderApp();
}

void startApp().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown bootstrap error";
  renderBootError(message);
});
