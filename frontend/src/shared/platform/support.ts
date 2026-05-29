import { detectRuntimePlatform, openPlatformExternalLink } from "@/shared/platform";

function readSupportUrl(platform: ReturnType<typeof detectRuntimePlatform>) {
  if (platform === "vk" && import.meta.env.VITE_SUPPORT_URL_VK) {
    return import.meta.env.VITE_SUPPORT_URL_VK;
  }

  if (platform === "telegram" && import.meta.env.VITE_SUPPORT_URL_TELEGRAM) {
    return import.meta.env.VITE_SUPPORT_URL_TELEGRAM;
  }

  return import.meta.env.VITE_SUPPORT_URL || "https://t.me/maiiamk";
}

function readSupportLabel(platform: ReturnType<typeof detectRuntimePlatform>) {
  if (platform === "vk" && import.meta.env.VITE_SUPPORT_LABEL_VK) {
    return import.meta.env.VITE_SUPPORT_LABEL_VK;
  }

  if (platform === "telegram" && import.meta.env.VITE_SUPPORT_LABEL_TELEGRAM) {
    return import.meta.env.VITE_SUPPORT_LABEL_TELEGRAM;
  }

  return import.meta.env.VITE_SUPPORT_LABEL || "@maiiamk";
}

export function getPlatformSupportUrl() {
  return readSupportUrl(detectRuntimePlatform());
}

export function getPlatformSupportLabel() {
  return readSupportLabel(detectRuntimePlatform());
}

export function openPlatformSupport() {
  openPlatformExternalLink(getPlatformSupportUrl());
}
