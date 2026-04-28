import { api } from "@/shared/api/client";
import { trackEvent } from "@/shared/analytics/metrica";

export type HealthCheck = {
  id: string;
  user_id: string;
  pet_id: string;
  weight_kg: string | null;
  appetite: number | null;
  water: number | null;
  urination_count: number | null;
  stool_count: number | null;
  stool_consistency: number | null;
  sleep_hours: string | null;
  activity: number | null;
  vomiting: string | null;
  itching: number | null;
  sleep_breathing: string | null;
  mood: number | null;
  pain: string | null;
  cough: string | null;
  discharge: string | null;
  owner_note: string | null;
  checked_at: string;
  created_at: string;
};

export type CreateHealthCheckPayload = {
  pet_id: string;
  weight_kg?: number | null;
  appetite?: number | null;
  water?: number | null;
  urination_count?: number | null;
  stool_count?: number | null;
  stool_consistency?: number | null;
  sleep_hours?: number | null;
  activity?: number | null;
  vomiting?: string | null;
  itching?: number | null;
  sleep_breathing?: string | null;
  mood?: number | null;
  pain?: string | null;
  cough?: string | null;
  discharge?: string | null;
  owner_note?: string | null;
};

export async function getHealthChecks(petId?: string | null) {
  const response = await api.get<HealthCheck[]>("/health-checks", {
    params: { pet_id: petId || undefined },
  });
  return response.data;
}

export async function createHealthCheck(payload: CreateHealthCheckPayload) {
  const response = await api.post<HealthCheck>("/health-checks", payload);
  trackEvent("health_check_created", {
    pet_id: payload.pet_id,
    has_note: Boolean(payload.owner_note),
  });
  return response.data;
}
