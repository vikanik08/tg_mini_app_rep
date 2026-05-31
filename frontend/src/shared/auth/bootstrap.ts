import { devLogin, telegramLogin, vkLogin } from "@/shared/auth/requests";
import { setAnalyticsUser, trackEvent } from "@/shared/analytics/metrica";
import { detectRuntimePlatform, getPlatformAuthContext } from "@/shared/platform";

export async function bootstrapAuth() {
  const useDevLogin = import.meta.env.VITE_USE_DEV_LOGIN === "true";

  if (useDevLogin) {
    const telegramId = Number(
      import.meta.env.VITE_DEV_TELEGRAM_ID || "999999999",
    );
    const data = await devLogin(telegramId);

    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("current_user", JSON.stringify(data.user));
    setAnalyticsUser(data.user);
    trackEvent("auth_success", {
      mode: "dev",
      subscription_plan: data.user.subscription_plan,
    });
    return;
  }

  const authContext = await getPlatformAuthContext();

  if (authContext?.platform === "telegram") {
    const data = await telegramLogin(authContext.initData);

    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("current_user", JSON.stringify(data.user));
    setAnalyticsUser(data.user);
    trackEvent("auth_success", {
      mode: "telegram",
      subscription_plan: data.user.subscription_plan,
    });
    return;
  }

  if (authContext?.platform === "vk") {
    const data = await vkLogin(authContext.launchParams);

    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("current_user", JSON.stringify(data.user));
    setAnalyticsUser(data.user);
    trackEvent("auth_success", {
      mode: "vk",
      subscription_plan: data.user.subscription_plan,
    });
    return;
  }

  const existingToken = localStorage.getItem("access_token");
  if (existingToken) return;

  const platform = detectRuntimePlatform();
  if (platform === "vk") {
    throw new Error("VK launch params are missing");
  }

  if (platform === "telegram") {
    throw new Error("Telegram initData is missing");
  }

  throw new Error("Platform launch params are missing");
}
