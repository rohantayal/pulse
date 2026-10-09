import { useApp } from "../store/app";
import { useUi } from "../store/ui";
import type { Routine } from "../types";
import { unlockAudio } from "../lib/sound";

/**
 * Start a workout (optionally from a routine). If one is already running, re-open it instead
 * of silently replacing it — the user discards it explicitly from the workout screen.
 */
export function useStartWorkout() {
  return (routine?: Routine) => {
    unlockAudio();
    const ui = useUi.getState();
    if (useApp.getState().active) {
      ui.showToast("Finish or discard your current workout first");
      ui.setWorkoutOpen(true);
      ui.setAdd(false);
      return;
    }
    useApp.getState().startWorkout(routine);
    ui.setAdd(false);
    ui.setWorkoutOpen(true);
  };
}
