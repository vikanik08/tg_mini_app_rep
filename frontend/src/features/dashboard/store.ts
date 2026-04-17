import { create } from "zustand";
import { getDashboard } from "@/entities/dashboard/api";
import type {
  DashboardEvent as Event,
  DashboardPet as Pet,
} from "@/entities/dashboard/api";

type DashboardState = {
  pets: Pet[];
  events: Event[];
  loading: boolean;
  load: () => Promise<void>;
};

export const useDashboardStore = create<DashboardState>((set) => ({
  pets: [],
  events: [],
  loading: false,

  load: async () => {
    set({ loading: true });

    try {
      const data = await getDashboard();

      set({
        pets: data.pets,
        events: data.upcoming_events,
        loading: false,
      });
    } catch (e) {
      console.error("dashboard load error", e);
      set({ loading: false });
    }
  },
}));
