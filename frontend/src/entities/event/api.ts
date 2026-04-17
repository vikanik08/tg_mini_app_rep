import { api } from "@/shared/api/client";

export type EventItem = {
  id: string;
  user_id: string;
  pet_id: string;
  type: "vaccine" | "flea_treatment" | "vet_visit" | "grooming" | "other";
  title: string;
  scheduled_at: string;
  is_done: boolean;
  done_at: string | null;
  notes: string | null;
  created_at: string;
};

export type EventType = EventItem["type"];

export type CreateEventPayload = {
  pet_id: string;
  type: EventType;
  title: string;
  scheduled_at: string;
  notes?: string | null;
};

export type UpdateEventPayload = Partial<CreateEventPayload> & {
  is_done?: boolean;
};

export async function getEvents(
  params?: Record<string, string | number | boolean>,
) {
  const response = await api.get<EventItem[]>("/events", { params });
  return response.data;
}

export async function createEvent(payload: CreateEventPayload) {
  const response = await api.post<EventItem>("/events", payload);
  return response.data;
}

export async function getEvent(eventId: string) {
  const response = await api.get<EventItem>(`/events/${eventId}`);
  return response.data;
}

export async function updateEvent(eventId: string, payload: UpdateEventPayload) {
  const response = await api.patch<EventItem>(`/events/${eventId}`, payload);
  return response.data;
}

export async function deleteEvent(eventId: string) {
  await api.delete(`/events/${eventId}`);
}

export async function completeEvent(eventId: string) {
  const response = await api.post<EventItem>(`/events/${eventId}/complete`);
  return response.data;
}

export async function uncompleteEvent(eventId: string) {
  const response = await api.post<EventItem>(`/events/${eventId}/uncomplete`);
  return response.data;
}
