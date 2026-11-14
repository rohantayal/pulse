import type { FoodLogEntry, NutritionGoals, WeightEntry } from "../types";
import type { Profile } from "./plan";
import { KCAL_PER_KG } from "./plan";
import { addDays, fromKey } from "./date";
import { sumEntries } from "./nutrition";

export type CheckinKind = "need-data" | "on-track" | "adjust" | "eat-to-target";

export interface Checkin {
  kind: CheckinKind;
  /** kg per week from the weigh-ins (negative = losing) */
  rate?: number;
  /** what the plan aims for, kg per week */
  targetRate: number;
  /** average kcal eaten on days with food logged */
  avgEaten?: number;
  loggedDays: number;
  /** suggested new daily calorie goal (only for "adjust") */
  suggested?: number;
  /** change from the current goal (only for "adjust") */
  delta?: number;
  title: string;
  message: string;
}

const WINDOW = 21; // days of weigh-ins to fit the trend on
const MIN_SPAN = 10; // need at least this many days between first and last weigh-in
const LOG_WINDOW = 14;
const TOLERANCE = 0.15; // kg/week that counts as "on track"
const MAX_STEP = 250; // never move the goal more than this in one go

/** Least-squares slope through the weigh-ins, in kg per week. */
export function weightTrend(weights: WeightEntry[], today: string): { rate: number; span: number; count: number } | null {
  const from = addDays(today, -WINDOW);
  const pts = weights.filter((w) => w.date > from && w.date <= today);
  if (pts.length < 3) return null;
  const t0 = fromKey(pts[0].date).getTime();
  const xs = pts.map((p) => (fromKey(p.date).getTime() - t0) / 864e5);
  const span = xs[xs.length - 1] - xs[0];
  if (span < MIN_SPAN) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = pts.reduce((a, p) => a + p.kg, 0) / pts.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (pts[i].kg - my);
    den += (x - mx) ** 2;
  });
  return { rate: (num / den) * 7, span, count: pts.length };
}

const fmtRate = (r: number) => `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r).toFixed(2)} kg/week`;
const round25 = (n: number) => Math.round(n / 25) * 25;

/**
 * A weekly look at whether the plan is working. Compares your weight trend with the pace you
 * picked and, only when you've been eating close to target, suggests nudging calories.
 */
export function weeklyCheckin(input: {
  weights: WeightEntry[];
  foodLog: FoodLogEntry[];
  goals: NutritionGoals;
  profile: Pick<Profile, "goal" | "pace" | "sex"> | null;
  today: string;
}): Checkin {
  const { weights, foodLog, goals, profile, today } = input;
  const goal = profile?.goal ?? "maintain";
  const targetRate = goal === "lose" ? -(profile?.pace ?? 0) : goal === "gain" ? profile?.pace ?? 0 : 0;

  const from = addDays(today, -LOG_WINDOW);
  const days = new Map<string, FoodLogEntry[]>();
  for (const e of foodLog) if (e.date > from && e.date < today) days.set(e.date, [...(days.get(e.date) ?? []), e]);
  const loggedDays = days.size;
  const avgEaten = loggedDays ? [...days.values()].reduce((a, es) => a + sumEntries(es).calories, 0) / loggedDays : undefined;

  const trend = weightTrend(weights, today);
  if (!trend) {
    return {
      kind: "need-data",
      targetRate,
      avgEaten,
      loggedDays,
      title: "Weekly check-in",
      message: "Weigh in 2–3 times a week for a couple of weeks and Pulse will tell you how your plan is going.",
    };
  }
  const rate = trend.rate;
  const off = rate - targetRate;
  const base = { rate, targetRate, avgEaten, loggedDays };

  if (Math.abs(off) <= TOLERANCE) {
    const what = goal === "lose" ? "losing" : goal === "gain" ? "gaining" : "holding steady";
    return {
      kind: "on-track",
      ...base,
      title: "Right on track",
      message: `You're ${what} at ${fmtRate(rate)}${goal === "maintain" ? "" : ` — your plan aims for ${fmtRate(targetRate)}`}. Keep doing what you're doing.`,
    };
  }

  // Off pace. If you haven't been eating to target, changing the target won't help.
  const enoughLogs = loggedDays >= 8 && avgEaten != null;
  if (enoughLogs && Math.abs(avgEaten - goals.calories) > 150) {
    const over = avgEaten > goals.calories;
    return {
      kind: "eat-to-target",
      ...base,
      title: "Hit your target first",
      message: `Weight is moving ${fmtRate(rate)} vs ${fmtRate(targetRate)} planned, but you've averaged ${Math.round(avgEaten)} kcal against a ${goals.calories} kcal goal. ${over ? "Bring that down" : "Eat a little more"} for a week or two before changing anything.`,
    };
  }
  if (!enoughLogs) {
    return {
      kind: "need-data",
      ...base,
      title: "Weekly check-in",
      message: `Weight is moving ${fmtRate(rate)} (plan: ${fmtRate(targetRate)}). Log food on most days for two weeks and Pulse can suggest a calorie tweak.`,
    };
  }

  // Each 1 kg/week off ≈ 1,100 kcal/day. Move in small steps and stay above a safe floor.
  const raw = (-off * KCAL_PER_KG) / 7;
  let delta = round25(Math.max(-MAX_STEP, Math.min(MAX_STEP, raw)));
  const floor = profile?.sex === "male" ? 1500 : 1200;
  const suggested = Math.max(floor, goals.calories + delta);
  delta = suggested - goals.calories;
  if (Math.abs(delta) < 25) {
    return { kind: "on-track", ...base, title: "Close enough", message: `You're at ${fmtRate(rate)}, near your ${fmtRate(targetRate)} plan. No change needed.` };
  }
  const faster = Math.abs(rate) > Math.abs(targetRate) && Math.sign(rate) === Math.sign(targetRate || rate);
  const why =
    goal === "maintain"
      ? `Your weight is drifting ${rate > 0 ? "up" : "down"} at ${fmtRate(rate)}.`
      : faster
        ? `You're ${goal === "lose" ? "losing" : "gaining"} faster than planned (${fmtRate(rate)} vs ${fmtRate(targetRate)}).`
        : `You're ${goal === "lose" ? "losing" : "gaining"} slower than planned (${fmtRate(rate)} vs ${fmtRate(targetRate)}).`;
  return {
    kind: "adjust",
    ...base,
    suggested,
    delta,
    title: `${delta > 0 ? "Eat" : "Trim"} ${Math.abs(delta)} kcal a day?`,
    message: `${why} Moving your goal from ${goals.calories} to ${suggested} kcal should bring it in line.`,
  };
}
