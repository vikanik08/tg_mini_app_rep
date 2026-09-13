import { detectRuntimePlatform, openPlatformExternalLink } from "@/shared/platform";
import type { AuthPlatform, RuntimePlatform } from "@/shared/platform/types";

const vkSupportHandle = "maiiamk";
type SupportPlatform = AuthPlatform | RuntimePlatform;

function resolveSupportPlatform(platform?: SupportPlatform) {
  if (platform === "vk" || platform === "telegram") {
    return platform;
  }

  return detectRuntimePlatform();
}

function readSupportUrl(platform: RuntimePlatform | "telegram" | "vk") {
  if (platform === "vk" && import.meta.env.VITE_SUPPORT_URL_VK) {
    return import.meta.env.VITE_SUPPORT_URL_VK;
  }

  if (platform === "telegram" && import.meta.env.VITE_SUPPORT_URL_TELEGRAM) {
    return import.meta.env.VITE_SUPPORT_URL_TELEGRAM;
  }

  if (platform === "vk") {
    return `https://vk.me/${vkSupportHandle}`;
  }

  return import.meta.env.VITE_SUPPORT_URL || "https://t.me/maiiamk";
}

function readSupportLabel(platform: RuntimePlatform | "telegram" | "vk") {
  if (platform === "vk" && import.meta.env.VITE_SUPPORT_LABEL_VK) {
    return import.meta.env.VITE_SUPPORT_LABEL_VK;
  }

  if (platform === "telegram" && import.meta.env.VITE_SUPPORT_LABEL_TELEGRAM) {
    return import.meta.env.VITE_SUPPORT_LABEL_TELEGRAM;
  }

  if (platform === "vk") {
    return `VK @${vkSupportHandle}`;
  }

  return import.meta.env.VITE_SUPPORT_LABEL || "@maiiamk";
}

function copySupportMessage(message?: string) {
  if (!message || !navigator.clipboard?.writeText) return;

  void navigator.clipboard.writeText(message).catch(() => {
    // The message is also passed in the chat URL; clipboard is only a backup.
  });
}

export function getPlatformSupportUrl(platform?: SupportPlatform) {
  return readSupportUrl(resolveSupportPlatform(platform));
}

export function getPlatformSupportLabel(platform?: SupportPlatform) {
  return readSupportLabel(resolveSupportPlatform(platform));
}

export function openPlatformSupport(message?: string, platformOverride?: SupportPlatform) {
  const platform = resolveSupportPlatform(platformOverride);

  if (platform === "vk") {
    copySupportMessage(message);
    openPlatformExternalLink(getPlatformSupportUrl("vk"));
    return;
  }

  copySupportMessage(message);
  openPlatformExternalLink(getPlatformSupportUrl());
}
