import { hasTelegramContext, initTelegramPlatform, openTelegramLink, waitForTelegramInitData } from "@/shared/platform/telegram";
import type { AuthPlatform, PlatformAuthContext, RuntimePlatform } from "@/shared/platform/types";
import { getVkLaunchParamsString, hasVkContext, initVkPlatform, openVkExternalLink } from "@/shared/platform/vk";

function getForcedPlatform() {
  const rawValue = (import.meta.env.VITE_PLATFORM_TARGET || "auto").toLowerCase();
  if (rawValue === "telegram" || rawValue === "vk") {
    return rawValue;
  }

  return "auto";
}

export function detectRuntimePlatform(): RuntimePlatform {
  const forcedPlatform = getForcedPlatform();
  if (forcedPlatform !== "auto") {
    return forcedPlatform;
  }

  if (hasVkContext()) return "vk";
  if (hasTelegramContext()) return "telegram";
  return "browser";
}

export async function initPlatform() {
  const platform = detectRuntimePlatform();

  if (platform === "telegram") {
    initTelegramPlatform();
    return;
  }

  if (platform === "vk") {
    await initVkPlatform();
  }
}

export async function getPlatformAuthContext(): Promise<PlatformAuthContext | null> {
  const platform = detectRuntimePlatform();

  if (platform === "telegram") {
    const initData = await waitForTelegramInitData();
    if (initData) {
      return { platform, initData };
    }

    return null;
  }

  if (platform === "vk") {
    const launchParams = getVkLaunchParamsString();
    if (launchParams) {
      return { platform, launchParams };
    }
  }

  return null;
}

export function openPlatformExternalLink(url: string) {
  const platform = detectRuntimePlatform();

  if (platform === "telegram") {
    openTelegramLink(url);
    return;
  }

  if (platform === "vk") {
    openVkExternalLink(url);
    return;
  }

  window.location.href = url;
}

export function getPlatformDisplayName(platform: RuntimePlatform | AuthPlatform) {
  if (platform === "telegram") return "Telegram";
  if (platform === "vk") return "VK";
  if (platform === "dev") return "Dev";
  return "Browser";
}

export function getPlatformIdLabel(platform: AuthPlatform) {
  if (platform === "vk") return "VK ID";
  if (platform === "dev") return "Dev ID";
  return "Telegram ID";
}
