import type { AuthUser } from "@/shared/auth/requests";

export type SubscriptionPlan = AuthUser["subscription_plan"];

export const planLabels: Record<SubscriptionPlan, string> = {
  basic: "Базовый",
  premium: "Премиум",
  family: "Семейная",
};

export function readCurrentUser(): AuthUser | null {
  const raw = localStorage.getItem("current_user");

  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getEffectivePlan(user = readCurrentUser()): SubscriptionPlan {
  if (!user) return "basic";

  if (
    (user.subscription_plan === "premium" || user.subscription_plan === "family")
    && user.subscription_expires_at
    && new Date(user.subscription_expires_at).getTime() <= Date.now()
  ) {
    return "basic";
  }

  return user.subscription_plan ?? "basic";
}

export function hasPremiumAccess(user = readCurrentUser()) {
  const plan = getEffectivePlan(user);
  return plan === "premium" || plan === "family";
}

export function getSubscriptionDaysLeft(user = readCurrentUser()) {
  if (!user?.subscription_expires_at) return null;

  const expiresAt = new Date(user.subscription_expires_at);
  if (Number.isNaN(expiresAt.getTime())) return null;

  const millisecondsLeft = expiresAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(millisecondsLeft / 86_400_000));
}

function formatDayWord(days: number) {
  const normalizedDays = Math.abs(days);
  const lastTwoDigits = normalizedDays % 100;
  const lastDigit = normalizedDays % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "дней";
  if (lastDigit === 1) return "день";
  if (lastDigit >= 2 && lastDigit <= 4) return "дня";
  return "дней";
}

export function getSubscriptionLabel(user = readCurrentUser()) {
  return planLabels[getEffectivePlan(user)];
}

export function formatSubscriptionDaysLeft(user = readCurrentUser()) {
  const plan = getEffectivePlan(user);

  if (plan === "basic") return "Нет активной подписки";

  const daysLeft = getSubscriptionDaysLeft(user);

  if (daysLeft === null) return "Активна без даты окончания";
  if (daysLeft === 0) return "Заканчивается сегодня";

  return `Осталось ${daysLeft} ${formatDayWord(daysLeft)}`;
}

export function formatSubscriptionExpiryDate(user = readCurrentUser()) {
  if (!user?.subscription_expires_at) return "";

  const expiresAt = new Date(user.subscription_expires_at);
  if (Number.isNaN(expiresAt.getTime())) return "";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(expiresAt);
}

export function formatSubscriptionStatus(user = readCurrentUser()) {
  const plan = getEffectivePlan(user);
  if (plan === "basic") return "Базовый тариф";

  return `${planLabels[plan]}: ${formatSubscriptionDaysLeft(user).toLowerCase()}`;
}

export function getPetLimit(user = readCurrentUser()) {
  const plan = getEffectivePlan(user);

  if (plan === "family") return Number.POSITIVE_INFINITY;
  if (plan === "premium") return 2;
  return 1;
}

export function canAddPet(currentPetsCount: number, user = readCurrentUser()) {
  return currentPetsCount < getPetLimit(user);
}
