import { api } from "@/shared/api/client";
import {
  buildTelegramAccountCopyLink,
  buildVkAccountCopyLink,
} from "@/shared/promo/promo";

export type AccountCopy = {
  token: string;
  status: "pending" | "accepted" | "cancelled" | "expired";
  from_user_name: string | null;
  source_platform: string;
  is_sender: boolean;
  pet_count: number;
  event_count: number;
  health_check_count: number;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  cancelled_at: string | null;
};

export function buildAccountCopyLinks(token: string) {
  const encodedToken = encodeURIComponent(token);

  return {
    telegram: buildTelegramAccountCopyLink(token),
    vk: buildVkAccountCopyLink(token),
    web: `${window.location.origin}/account-copy/${encodedToken}`,
  };
}

export async function createAccountCopy() {
  const response = await api.post<AccountCopy>("/account-copies");
  return response.data;
}

export async function getAccountCopy(token: string) {
  const response = await api.get<AccountCopy>(`/account-copies/${token}`);
  return response.data;
}

export async function acceptAccountCopy(token: string) {
  const response = await api.post<AccountCopy>(`/account-copies/${token}/accept`);
  return response.data;
}
