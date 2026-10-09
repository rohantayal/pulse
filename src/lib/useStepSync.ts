import { useEffect } from "react";
import { useApp } from "../store/app";
import { isNative } from "./platform";
import { readDailySteps, stepsGranted } from "./health";

/** Pull the last two weeks of steps from Health Connect (on open, on return, and every 5 minutes). */
export async function syncStepsNow(): Promise<number> {
  const days = await readDailySteps(14);
  const st = useApp.getState();
  st.importSteps(days);
  st.setHealthSteps({ enabled: true, lastSync: Date.now() });
  return days.reduce((a, d) => a + (d.steps > 0 ? 1 : 0), 0);
}

export function useStepSync() {
  const enabled = useApp((s) => s.healthSteps.enabled);
  useEffect(() => {
    if (!isNative || !enabled) return;
    let busy = false;
    const run = async () => {
      if (busy) return;
      busy = true;
      try {
        // Permission can be revoked in Health Connect at any time — stop quietly if so.
        if (!(await stepsGranted())) {
          useApp.getState().setHealthSteps({ enabled: false });
          return;
        }
        await syncStepsNow();
      } catch {
        /* offline or Health Connect busy — try again next time */
      } finally {
        busy = false;
      }
    };
    void run();
    const onVisible = () => document.visibilityState === "visible" && void run();
    document.addEventListener("visibilitychange", onVisible);
    // Keep today's count fresh while the app stays open.
    const timer = window.setInterval(() => document.visibilityState === "visible" && void run(), 5 * 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [enabled]);
}
