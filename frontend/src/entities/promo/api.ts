import { api } from "@/shared/api/client";
import { normalizeAuthUser, type AuthUser } from "@/shared/auth/requests";

export type PromoRedeemResponse = {
  code: string;
  plan: AuthUser["subscription_plan"];
  expires_at: string | null;
  already_redeemed: boolean;
  user: AuthUser;
};

export async function redeemPromo(code: string) {
  const response = await api.post<PromoRedeemResponse>("/promos/redeem", { code });

  return {
    ...response.data,
    user: normalizeAuthUser(response.data.user),
  };
}
