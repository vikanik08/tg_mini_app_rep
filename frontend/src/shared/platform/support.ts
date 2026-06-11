import { detectRuntimePlatform, openPlatformExternalLink } from "@/shared/platform";

const vkSupportHandle = "maiiamk";

function readSupportUrl(platform: ReturnType<typeof detectRuntimePlatform>) {
  if (platform === "vk" && import.meta.env.VITE_SUPPORT_URL_VK) {
    return import.meta.env.VITE_SUPPORT_URL_VK;
  }

  if (platform === "telegram" && import.meta.env.VITE_SUPPORT_URL_TELEGRAM) {
    return import.meta.env.VITE_SUPPORT_URL_TELEGRAM;
  }

  if (platform === "vk") {
    return `https://vk.ru/${vkSupportHandle}`;
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

  if (platform === "vk") {
    return `vk.ru/${vkSupportHandle}`;
  }

  return import.meta.env.VITE_SUPPORT_LABEL || "@maiiamk";
}

function buildVkChatUrl(message?: string) {
  const params = new URLSearchParams({ sel: vkSupportHandle });

  if (message) {
    params.set("msg", message);
  }

  return `https://vk.ru/im?${params.toString()}`;
}

function copySupportMessage(message?: string) {
  if (!message || !navigator.clipboard?.writeText) return;

  void navigator.clipboard.writeText(message).catch(() => {
    // The message is also passed in the chat URL; clipboard is only a backup.
  });
}

export function getPlatformSupportUrl() {
  return readSupportUrl(detectRuntimePlatform());
}

export function getPlatformSupportLabel() {
  return readSupportLabel(detectRuntimePlatform());
}

export function openPlatformSupport(message?: string) {
  const platform = detectRuntimePlatform();

  if (platform === "vk") {
    copySupportMessage(message);
    openPlatformExternalLink(buildVkChatUrl(message));
    return;
  }

  copySupportMessage(message);
  openPlatformExternalLink(getPlatformSupportUrl());
}
