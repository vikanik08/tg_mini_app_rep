import bridge, { parseURLSearchParamsForGetLaunchParams } from "@vkontakte/vk-bridge";

type VkLaunchParams = Partial<{
  sign: string;
  vk_platform: string;
  vk_user_id: string | number;
}>;

export function getVkLaunchParams() {
  try {
    return parseURLSearchParamsForGetLaunchParams(window.location.search) as VkLaunchParams;
  } catch {
    return {};
  }
}

export function hasVkContext() {
  const params = getVkLaunchParams();
  return Boolean(params.sign || params.vk_platform || params.vk_user_id);
}

export function getVkLaunchParamsString() {
  return window.location.search.replace(/^\?/, "");
}

export async function initVkPlatform() {
  if (!hasVkContext()) return;

  try {
    await bridge.send("VKWebAppInit");
  } catch {
    // VK bridge may be unavailable in a plain browser; no-op keeps dev mode safe.
  }
}

export function openVkExternalLink(url: string) {
  const openedWindow = window.open(url, "_blank", "noopener,noreferrer");
  if (!openedWindow) {
    window.location.href = url;
  }
}
