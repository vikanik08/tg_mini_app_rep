import bridge, { parseURLSearchParamsForGetLaunchParams } from "@vkontakte/vk-bridge";

type VkLaunchParams = Partial<{
  sign: string;
  vk_platform: string;
  vk_user_id: string | number;
}>;

function normalizeParams(value: string) {
  const cleaned = value.replace(/^[?#]/, "");
  const queryStart = cleaned.indexOf("?");

  return queryStart >= 0 ? cleaned.slice(queryStart + 1) : cleaned;
}

function hasVkMarkers(value: string) {
  const params = new URLSearchParams(normalizeParams(value));
  return Boolean(
    params.get("sign")
      || params.get("vk_platform")
      || params.get("vk_user_id"),
  );
}

function getVkLaunchParamsSource() {
  const candidates = [
    window.location.search,
    window.location.hash,
  ];

  return candidates.find(hasVkMarkers) ?? "";
}

export function getVkLaunchParams() {
  try {
    const source = getVkLaunchParamsSource();
    return parseURLSearchParamsForGetLaunchParams(
      source.startsWith("?") ? source : `?${normalizeParams(source)}`,
    ) as VkLaunchParams;
  } catch {
    return {};
  }
}

export function hasVkContext() {
  const params = getVkLaunchParams();
  return Boolean(params.sign || params.vk_platform || params.vk_user_id);
}

export function getVkLaunchParamsString() {
  return normalizeParams(getVkLaunchParamsSource());
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
