export type Pet = {
  id: string;
  name: string;
  species: "CAT" | "DOG" | "OTHER";
  breed?: string | null;
  birthdate?: string | null;
};

export type Event = {
  id: string;
  pet_id: string;
  title: string;
  type: string;
  start_at: string;
  end_at?: string | null;
  notes?: string | null;
};

export type DashboardResponse = {
  pets: Pet[];
  upcoming_events: Event[];
};
