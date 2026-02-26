import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiState = {
  modelById: Record<string, string>;
  setModel: (id: string, model: string) => void;
  removeModel: (id: string) => void;
  dashboardSearch: string;
  setDashboardSearch: (value: string) => void;
  autoRefreshEnabled: boolean;
  setAutoRefreshEnabled: (value: boolean) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      modelById: {},
      setModel: (id, model) =>
        set((state) => ({
          modelById: {
            ...state.modelById,
            [id]: model,
          },
        })),
      removeModel: (id) =>
        set((state) => {
          const next = { ...state.modelById };
          delete next[id];
          return { modelById: next };
        }),
      dashboardSearch: "",
      setDashboardSearch: (value) => set({ dashboardSearch: value }),
      autoRefreshEnabled: true,
      setAutoRefreshEnabled: (value) => set({ autoRefreshEnabled: value }),
    }),
    {
      name: "olt-ui",
      partialize: (state) => ({
        modelById: state.modelById,
        dashboardSearch: state.dashboardSearch,
        autoRefreshEnabled: state.autoRefreshEnabled,
      }),
    }
  )
);
