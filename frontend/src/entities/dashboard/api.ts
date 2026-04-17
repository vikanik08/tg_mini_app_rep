import { api } from "@/shared/api/client";

export type DashboardEvent = {
  id: string;
  user_id: string;
  pet_id: string;
  type: string;
  title: string;
  scheduled_at: string;
  is_done: boolean;
  done_at: string | null;
  notes: string | null;
  created_at: string;
};

export type DashboardPet = {
  id: string;
  user_id: string;
  name: string;
  species: string;
  sex: string;
  birthdate: string | null;
  weight_kg: string | null;
  photo_url: string | null;
  created_at: string;
  next_event: DashboardEvent | null;
};

export type DashboardResponse = {
  user: {
    id: string;
    telegram_id: number;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    timezone: string;
  };
  pets: DashboardPet[];
  upcoming_events: DashboardEvent[];
};

export async function getDashboard() {
  const response = await api.get<DashboardResponse>("/dashboard");
  return response.data;
}
