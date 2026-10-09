import { create } from "zustand";
import type { Meal } from "../types";

export type Tab = "history" | "routines" | "today" | "foods";

/** Full-screen pages pushed over the tabs. */
export type Page =
  | { kind: "logFood"; meal: Meal; date: string }
  | { kind: "foodEditor"; foodId?: string; name?: string }
  | { kind: "routineEditor"; routineId?: string }
  | { kind: "workoutDetail"; workoutId: string }
  | { kind: "workoutEditor"; workoutId: string }
  | { kind: "exerciseProgress"; exerciseId: string }
  | { kind: "nutritionGoals" }
  | { kind: "nutritionWeekly" }
  | { kind: "weight" }
  | { kind: "exerciseGoals" }
  | { kind: "exerciseWeekly" }
  | { kind: "onboarding" }
  | { kind: "settings" };

interface UiState {
  tab: Tab;
  stack: Page[];
  menuOpen: boolean;
  addOpen: boolean;
  workoutOpen: boolean;
  toast: string | null;
  setTab: (t: Tab) => void;
  push: (p: Page) => void;
  pop: () => void;
  setMenu: (open: boolean) => void;
  setAdd: (open: boolean) => void;
  setWorkoutOpen: (open: boolean) => void;
  showToast: (msg: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useUi = create<UiState>((set) => ({
  tab: "today",
  stack: [],
  menuOpen: false,
  addOpen: false,
  workoutOpen: false,
  toast: null,
  setTab: (tab) => set({ tab, stack: [] }),
  push: (p) => set((s) => ({ stack: [...s.stack, p], menuOpen: false, addOpen: false })),
  pop: () => set((s) => ({ stack: s.stack.slice(0, -1) })),
  setMenu: (menuOpen) => set({ menuOpen }),
  setAdd: (addOpen) => set({ addOpen }),
  setWorkoutOpen: (workoutOpen) => set({ workoutOpen }),
  showToast: (toast) => {
    clearTimeout(toastTimer);
    set({ toast });
    toastTimer = setTimeout(() => set({ toast: null }), 2200);
  },
}));
