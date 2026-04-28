import type { AuthUser } from "@/shared/auth/requests";

type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;
type YmFunction = (
  counterId: number,
  method: "init" | "hit" | "reachGoal" | "params" | "userParams",
  ...args: unknown[]
) => void;

declare global {
  interface Window {
    ym?: YmFunction;
  }
}

const rawCounterId = import.meta.env.VITE_YANDEX_METRICA_ID;
const counterId = Number.parseInt(rawCounterId ?? "", 10);
const isEnabled = Number.isFinite(counterId) && counterId > 0;
let isInitialized = false;

function sanitizeParams(params?: AnalyticsParams) {
  if (!params) return undefined;

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  );
}

function callYm(method: Parameters<YmFunction>[1], ...args: unknown[]) {
  if (!isEnabled || typeof window === "undefined" || typeof window.ym !== "function") {
    return;
  }

  window.ym(counterId, method, ...args);
}

export function initAnalytics() {
  if (!isEnabled || isInitialized || typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const scopedWindow = window as Window & {
    ym?: ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
  };

  if (!scopedWindow.ym) {
    const queuedYm = ((...queueArgs: unknown[]) => {
      queuedYm.a = queuedYm.a || [];
      queuedYm.a.push(queueArgs);
    }) as ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };

    queuedYm.l = Date.now();
    scopedWindow.ym = queuedYm;
  }

  const scriptUrl = `https://mc.yandex.ru/metrika/tag.js?id=${counterId}`;
  const hasScript = Array.from(document.scripts).some((script) => script.src === scriptUrl);

  if (!hasScript) {
    const script = document.createElement("script");
    const firstScript = document.scripts[0];

    script.async = true;
    script.src = scriptUrl;

    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }

  callYm("init", {
    webvisor: true,
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    trackHash: true,
  });

  isInitialized = true;
}

export function trackPageView(path: string, params?: AnalyticsParams) {
  const cleanedParams = sanitizeParams(params);
  callYm("hit", path, cleanedParams ? { params: cleanedParams } : undefined);
}

export function trackEvent(goal: string, params?: AnalyticsParams) {
  callYm("reachGoal", goal, sanitizeParams(params));
}

export function trackButtonClick(buttonId: string, params?: AnalyticsParams) {
  trackEvent("button_click", {
    button_id: buttonId,
    ...params,
  });
}

export function trackFeatureUse(feature: string, action = "open", params?: AnalyticsParams) {
  trackEvent("feature_use", {
    feature,
    action,
    ...params,
  });
}

export function trackScreenView(screen: string, params?: AnalyticsParams) {
  trackEvent("screen_view", {
    screen,
    ...params,
  });
}

export function setAnalyticsUser(user: AuthUser) {
  callYm("userParams", {
    UserID: user.id,
    subscription_plan: user.subscription_plan,
    timezone: user.timezone,
  });
}

export function isAnalyticsEnabled() {
  return isEnabled;
}
