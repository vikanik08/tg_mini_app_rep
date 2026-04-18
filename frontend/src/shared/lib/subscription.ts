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

export function getPetLimit(user = readCurrentUser()) {
  const plan = getEffectivePlan(user);

  if (plan === "family") return Number.POSITIVE_INFINITY;
  if (plan === "premium") return 2;
  return 1;
}

export function canAddPet(currentPetsCount: number, user = readCurrentUser()) {
  return currentPetsCount < getPetLimit(user);
}
