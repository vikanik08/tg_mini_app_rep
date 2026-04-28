import { api } from "@/shared/api/client";
import { trackEvent } from "@/shared/analytics/metrica";

export type EventItem = {
  id: string;
  user_id: string;
  pet_id: string;
  type: "vaccine" | "flea_treatment" | "vet_visit" | "grooming" | "other";
  title: string;
  scheduled_at: string;
  is_done: boolean;
  done_at: string | null;
  reminder_sent_at: string | null;
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
  trackEvent("reminder_created", {
    event_type: payload.type,
    pet_id: payload.pet_id,
  });
  return response.data;
}

export async function getEvent(eventId: string) {
  const response = await api.get<EventItem>(`/events/${eventId}`);
  return response.data;
}

export async function updateEvent(eventId: string, payload: UpdateEventPayload) {
  const response = await api.patch<EventItem>(`/events/${eventId}`, payload);
  trackEvent("reminder_updated", {
    event_id: eventId,
    event_type: payload.type ?? null,
    is_done: payload.is_done ?? null,
  });
  return response.data;
}

export async function deleteEvent(eventId: string) {
  await api.delete(`/events/${eventId}`);
  trackEvent("reminder_deleted", { event_id: eventId });
}

export async function completeEvent(eventId: string) {
  const response = await api.post<EventItem>(`/events/${eventId}/complete`);
  trackEvent("reminder_completed", { event_id: eventId });
  return response.data;
}

export async function uncompleteEvent(eventId: string) {
  const response = await api.post<EventItem>(`/events/${eventId}/uncomplete`);
  trackEvent("reminder_uncompleted", { event_id: eventId });
  return response.data;
}
