import { create } from "zustand";

type AppState = {
  hasEntered: boolean;
  enter: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  hasEntered: false,
  enter: () => set({ hasEntered: true }),
}));
