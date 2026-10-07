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
    dataLayer?: unknown[];
    __SMARTPET_METRICA_BOOTSTRAPPED__?: boolean;
    __SMARTPET_METRICA_COUNTER_ID__?: number;
  }
}

const rawCounterId = import.meta.env.VITE_YANDEX_METRICA_ID;
const counterId = Number.parseInt(rawCounterId ?? "112520314", 10);
const isEnabled = Number.isFinite(counterId) && counterId > 0;
let isInitialized = false;
let lastPageViewPath: string | null = null;
const attributionStorageKey = "smartpet_metrica_attribution";
const attributionParamNames = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_referrer",
  "promo",
];

const METRICA_SCRIPT_URLS = [
  `https://mc.yandex.ru/metrika/tag.js?id=${counterId}`,
  `https://mc.yandex.com/metrika/tag.js?id=${counterId}`,
];

function sanitizeParams(params?: AnalyticsParams) {
  if (!params) return undefined;

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  );
}

function readParamsFrom(value: string) {
  const cleaned = value.replace(/^[?#]/, "");
  const queryStart = cleaned.indexOf("?");
  const paramsSource = queryStart >= 0 ? cleaned.slice(queryStart + 1) : cleaned;

  return new URLSearchParams(paramsSource);
}

function readTelegramStartParam() {
  const fromWebApp = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (fromWebApp) return fromWebApp;

  for (const source of [window.location.search, window.location.hash]) {
    const params = readParamsFrom(source);

    for (const paramName of ["tgWebAppStartParam", "start_param", "startapp"]) {
      const value = params.get(paramName);
      if (value) return value;
    }
  }

  return "";
}

function readAttributionFromTelegramStartParam() {
  const startParam = readTelegramStartParam();
  const parts = startParam.split("__");

  if (parts[0]?.startsWith("utm_") && parts.length >= 4) {
    return {
      utm_source: parts[0].slice("utm_".length),
      utm_medium: parts[1],
      utm_campaign: parts[2],
      utm_content: parts[3],
      utm_term: parts[4],
    };
  }

  if (parts[0]?.startsWith("promo_") && parts.length >= 5) {
    return {
      promo: parts[0].slice("promo_".length),
      utm_source: parts[1],
      utm_medium: parts[2],
      utm_campaign: parts[3],
      utm_content: parts[4],
      utm_term: parts[5],
    };
  }

  return {};
}

function readAttributionFromLocation() {
  const attribution: AnalyticsParams = readAttributionFromTelegramStartParam();

  for (const source of [window.location.search, window.location.hash]) {
    const params = readParamsFrom(source);

    for (const paramName of attributionParamNames) {
      const value = params.get(paramName);
      if (value && attribution[paramName] === undefined) {
        attribution[paramName] = value;
      }
    }
  }

  return attribution;
}

function getAttributionParams() {
  if (typeof window === "undefined") return {};

  const currentAttribution = readAttributionFromLocation();
  const hasCurrentAttribution = Object.keys(currentAttribution).length > 0;

  if (hasCurrentAttribution) {
    sessionStorage.setItem(attributionStorageKey, JSON.stringify(currentAttribution));
    return currentAttribution;
  }

  try {
    const storedValue = sessionStorage.getItem(attributionStorageKey);
    return storedValue ? JSON.parse(storedValue) as AnalyticsParams : {};
  } catch {
    return {};
  }
}

function withAttribution(params?: AnalyticsParams) {
  return sanitizeParams({
    ...getAttributionParams(),
    ...params,
  });
}

function appendAttributionToPath(path: string) {
  const attribution = getAttributionParams();
  const utmEntries = Object.entries(attribution).filter(([key]) => key.startsWith("utm_"));

  if (!utmEntries.length || path.includes("utm_source=") || path.includes("utm_medium=")) {
    return path;
  }

  const [pathWithoutHash, hash = ""] = path.split("#", 2);
  const separator = pathWithoutHash.includes("?") ? "&" : "?";
  const query = new URLSearchParams();

  for (const [key, value] of utmEntries) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      query.set(key, String(value));
    }
  }

  const suffix = query.toString();
  if (!suffix) return path;

  return `${pathWithoutHash}${separator}${suffix}${hash ? `#${hash}` : ""}`;
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

  if (window.__SMARTPET_METRICA_BOOTSTRAPPED__ === true) {
    isInitialized = true;
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

  const hasScript = Array.from(document.scripts).some((script) =>
    METRICA_SCRIPT_URLS.includes(script.src),
  );

  window.dataLayer = window.dataLayer || [];

  if (!hasScript) {
    const script = document.createElement("script");
    const firstScript = document.scripts[0];
    let fallbackIndex = 0;

    const loadScript = () => {
      script.src = METRICA_SCRIPT_URLS[fallbackIndex];
    };

    script.onerror = () => {
      fallbackIndex += 1;
      if (fallbackIndex < METRICA_SCRIPT_URLS.length) {
        loadScript();
      }
    };

    script.async = true;
    loadScript();

    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }

  callYm("init", {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    referrer: document.referrer,
    url: window.location.href,
    trackLinks: true,
    accurateTrackBounce: true,
    trackHash: true,
  });

  isInitialized = true;
}

export function trackPageView(path: string, params?: AnalyticsParams) {
  if (lastPageViewPath === path) {
    return;
  }

  lastPageViewPath = path;
  const analyticsPath = appendAttributionToPath(path);
  const cleanedParams = withAttribution(params);
  callYm("hit", analyticsPath, cleanedParams ? { params: cleanedParams } : undefined);
}

export function trackEvent(goal: string, params?: AnalyticsParams) {
  callYm("reachGoal", goal, withAttribution(params));
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
    platform: user.platform,
    platform_user_id: user.platform_user_id,
    subscription_plan: user.subscription_plan,
    timezone: user.timezone,
  });
}

export function isAnalyticsEnabled() {
  return isEnabled;
}
