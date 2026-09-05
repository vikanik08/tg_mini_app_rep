import { devLogin, telegramLogin, vkLogin } from "@/shared/auth/requests";
import { setAnalyticsUser, trackEvent } from "@/shared/analytics/metrica";
import { detectRuntimePlatform, getPlatformAuthContext } from "@/shared/platform";
import { redeemPromo } from "@/entities/promo/api";
import { getLaunchPromoCode } from "@/shared/promo/promo";

function storeAuthUser(data: Awaited<ReturnType<typeof devLogin | typeof telegramLogin | typeof vkLogin>>) {
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("current_user", JSON.stringify(data.user));
  setAnalyticsUser(data.user);
}

function formatPromoNotice(plan: "basic" | "premium" | "family" | "breeder", code: string) {
  const planLabels = {
    basic: "Базовый тариф",
    premium: "Премиум",
    family: "Семейная подписка",
    breeder: "Тариф Заводчик",
  };
  const planLabel = planLabels[plan];
  const daysMatch = code.match(/\d+/);
  const daysText = daysMatch ? ` на ${daysMatch[0]} дней` : "";

  return `${planLabel} активирована бесплатно${daysText}.`;
}

async function redeemLaunchPromo() {
  const promoCode = getLaunchPromoCode();
  if (!promoCode) return;

  try {
    const data = await redeemPromo(promoCode);
    localStorage.setItem("current_user", JSON.stringify(data.user));
    sessionStorage.setItem(
      "promo_notice",
      data.already_redeemed
        ? "Промокод уже был активирован ранее."
        : formatPromoNotice(data.plan, data.code),
    );
    trackEvent("promo_redeemed", {
      code: data.code,
      plan: data.plan,
      already_redeemed: data.already_redeemed,
    });
  } catch (error) {
    console.warn("Promo redemption failed", error);
    trackEvent("promo_redeem_failed", { code: promoCode });
  }
}

export async function bootstrapAuth() {
  const useDevLogin = import.meta.env.VITE_USE_DEV_LOGIN === "true";

  if (useDevLogin) {
    const telegramId = Number(
      import.meta.env.VITE_DEV_TELEGRAM_ID || "999999999",
    );
    const data = await devLogin(telegramId);

    storeAuthUser(data);
    trackEvent("auth_success", {
      mode: "dev",
      subscription_plan: data.user.subscription_plan,
    });
    await redeemLaunchPromo();
    return;
  }

  const authContext = await getPlatformAuthContext();

  if (authContext?.platform === "telegram") {
    const data = await telegramLogin(authContext.initData);

    storeAuthUser(data);
    trackEvent("auth_success", {
      mode: "telegram",
      subscription_plan: data.user.subscription_plan,
    });
    await redeemLaunchPromo();
    return;
  }

  if (authContext?.platform === "vk") {
    const data = await vkLogin(authContext.launchParams);

    storeAuthUser(data);
    trackEvent("auth_success", {
      mode: "vk",
      subscription_plan: data.user.subscription_plan,
    });
    await redeemLaunchPromo();
    return;
  }

  const existingToken = localStorage.getItem("access_token");
  if (existingToken) {
    await redeemLaunchPromo();
    return;
  }

  const platform = detectRuntimePlatform();
  if (platform === "vk") {
    throw new Error("VK launch params are missing");
  }

  if (platform === "telegram") {
    throw new Error("Telegram initData is missing");
  }

  throw new Error("Platform launch params are missing");
}
