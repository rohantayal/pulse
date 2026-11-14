import { LocalNotifications } from "@capacitor/local-notifications";
import type { Meal, Reminders } from "../types";
import { useApp } from "../store/app";
import { useUi } from "../store/ui";
import { addDays, fromKey, todayKey } from "./date";
import { isDue, progress } from "./habits";
import { isNative } from "./platform";

const MEALS = ["breakfast", "lunch", "dinner"] as const;
const DAYS_AHEAD = 7;
/** ids 5000–5999 belong to us: 5000 + day*10 + slot (0–2 meals, 5 habits) */
const idFor = (day: number, slot: number) => 5000 + day * 10 + slot;
const MEAL_TEXT: Record<(typeof MEALS)[number], string> = {
  breakfast: "What did you have for breakfast?",
  lunch: "Had lunch? Log it while you remember.",
  dinner: "Log dinner to close out the day.",
};

export interface PlannedReminder {
  id: number;
  at: Date;
  title: string;
  body: string;
  extra: { meal?: Meal; date: string; habits?: boolean };
}

interface PlanInput {
  reminders: Reminders;
  foodLog: { date: string; meal: Meal }[];
  habits: Parameters<typeof isDue>[0][];
  habitLog: Parameters<typeof progress>[2];
  day: Parameters<typeof progress>[3];
}

function atTime(date: string, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = fromKey(date);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/**
 * Reminders for the next week. Today's are dropped once they're pointless: a meal reminder
 * when that meal is already logged, the habit reminder when every habit due today is done.
 */
export function planReminders(input: PlanInput, now = new Date()): PlannedReminder[] {
  const { reminders } = input;
  const today = todayKey();
  const out: PlannedReminder[] = [];
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const date = addDays(today, d);
    MEALS.forEach((meal, slot) => {
      const r = reminders.meals[meal];
      if (!r.on) return;
      const at = atTime(date, r.time);
      if (at <= now) return;
      if (d === 0 && input.foodLog.some((e) => e.date === date && e.meal === meal)) return;
      out.push({ id: idFor(d, slot), at, title: `Log ${meal}`, body: MEAL_TEXT[meal], extra: { meal, date } });
    });
    if (reminders.habits.on) {
      const at = atTime(date, reminders.habits.time);
      const due = input.habits.filter((h) => isDue(h, date));
      if (at > now && due.length) {
        const left = d === 0 ? due.filter((h) => !progress(h, date, input.habitLog, input.day).done) : due;
        if (left.length) {
          out.push({
            id: idFor(d, 5),
            at,
            title: "Habits",
            body: d === 0 ? `${left.length} habit${left.length > 1 ? "s" : ""} left today — you've got this.` : "Check in on today's habits.",
            extra: { date, habits: true },
          });
        }
      }
    }
  }
  return out;
}

export async function reminderPermission(): Promise<boolean> {
  if (!isNative) return false;
  let p = await LocalNotifications.checkPermissions();
  if (p.display === "prompt" || p.display === "prompt-with-rationale") p = await LocalNotifications.requestPermissions();
  return p.display === "granted";
}

let syncing: Promise<void> | null = null;
let again = false;

/** Re-plan every reminder from the current state. Safe to call often. */
export function syncReminders(): Promise<void> {
  if (!isNative) return Promise.resolve();
  if (syncing) {
    again = true;
    return syncing;
  }
  syncing = (async () => {
    try {
      const s = useApp.getState();
      const pending = await LocalNotifications.getPending();
      const ours = pending.notifications.filter((n) => n.id >= 5000 && n.id < 6000);
      if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
      const anyOn = s.reminders.habits.on || MEALS.some((m) => s.reminders.meals[m].on);
      if (!anyOn) return;
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted") return;
      const plan = planReminders({
        reminders: s.reminders,
        foodLog: s.foodLog,
        habits: s.habits,
        habitLog: s.habitLog,
        day: { foodLog: s.foodLog, workouts: s.workouts, goals: s.nutritionGoals },
      });
      if (plan.length) {
        await LocalNotifications.schedule({
          notifications: plan.map((r) => ({
            id: r.id,
            title: r.title,
            body: r.body,
            schedule: { at: r.at, allowWhileIdle: true },
            smallIcon: "ic_stat_pulse",
            extra: r.extra,
          })),
        });
      }
    } catch (e) {
      console.warn("reminders", e);
    } finally {
      syncing = null;
      if (again) {
        again = false;
        void syncReminders();
      }
    }
  })();
  return syncing;
}

/** Keep reminders in step with the app, and open the right screen when one is tapped. */
export function startReminders(): () => void {
  if (!isNative) return () => {};
  void syncReminders();
  let timer = 0;
  const unsub = useApp.subscribe((s, prev) => {
    if (s.reminders === prev.reminders && s.foodLog === prev.foodLog && s.habitLog === prev.habitLog && s.habits === prev.habits && s.workouts === prev.workouts) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void syncReminders(), 800);
  });
  const onVis = () => document.visibilityState === "visible" && void syncReminders();
  document.addEventListener("visibilitychange", onVis);
  const listener = LocalNotifications.addListener("localNotificationActionPerformed", (a) => {
    const extra = a.notification.extra as PlannedReminder["extra"] | undefined;
    const ui = useUi.getState();
    useApp.getState().setDate(todayKey());
    ui.setTab("today");
    if (extra?.meal) ui.push({ kind: "logFood", meal: extra.meal, date: todayKey() });
  });
  return () => {
    unsub();
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVis);
    void listener.then((l) => l.remove());
  };
}
