import type { AutoHabit, FoodLogEntry, Habit, HabitLog, NutritionGoals, Workout } from "../types";
import { addDays, fromKey, todayKey } from "./date";
import { calorieStatus, sumEntries } from "./nutrition";

export const AUTO_HABITS: { auto: AutoHabit; name: string; short: string; hint: string; emoji: string }[] = [
  { auto: "workout", name: "Work out", short: "Workout", hint: "Ticks when you finish a workout", emoji: "💪" },
  { auto: "protein", name: "Hit protein goal", short: "Protein", hint: "Ticks when you reach your daily protein", emoji: "🥩" },
  { auto: "meals", name: "Log every meal", short: "Meals", hint: "Ticks when breakfast, lunch and dinner all have food", emoji: "🍽️" },
  { auto: "calories", name: "Stay within calories", short: "Calories", hint: "Ticks on a green day", emoji: "✅" },
];

/** Emojis offered in the habit editor. */
export const HABIT_EMOJIS = ["💧", "📖", "😴", "🧘", "🚶", "🏃", "🍬", "🥗", "🍎", "☕", "🚭", "🍺", "📵", "💊", "🦷", "🧴", "✍️", "🎸", "🧠", "🙏", "🌅", "🧹", "💰", "⭐"];

const KEYWORD_EMOJI: [RegExp, string][] = [
  [/water|hydrat/i, "💧"],
  [/read|book|page/i, "📖"],
  [/sleep|bed/i, "😴"],
  [/meditat|breath|mindful/i, "🧘"],
  [/walk|step/i, "🚶"],
  [/run|jog|cardio/i, "🏃"],
  [/sugar|sweet|dessert/i, "🍬"],
  [/veg|salad|fruit/i, "🥗"],
  [/coffee|caffeine/i, "☕"],
  [/smok|cigar/i, "🚭"],
  [/alcohol|drink|beer/i, "🍺"],
  [/phone|screen|social/i, "📵"],
  [/vitamin|pill|supplement|creatine/i, "💊"],
  [/floss|teeth|brush/i, "🦷"],
  [/skin|sunscreen/i, "🧴"],
  [/journal|write|diary/i, "✍️"],
  [/pray|gratitude|thank/i, "🙏"],
  [/stretch|yoga/i, "🧘"],
  [/save|money|spend/i, "💰"],
];

/** The habit's icon: its own emoji, or one guessed from the name. */
export function habitEmoji(h: Pick<Habit, "emoji" | "name" | "auto">): string {
  if (h.emoji) return h.emoji;
  if (h.auto) return AUTO_HABITS.find((a) => a.auto === h.auto)!.emoji;
  return KEYWORD_EMOJI.find(([re]) => re.test(h.name))?.[1] ?? "⭐";
}

/** A short label for under a ring: the first word, or two short ones ("No sugar"). */
export function shortName(name: string, auto?: AutoHabit): string {
  const a = auto && AUTO_HABITS.find((x) => x.auto === auto);
  // a self-ticking habit you haven't renamed gets its tidy label
  if (a && a.name === name.trim()) return a.short;
  const words = name.trim().split(/\s+/);
  if (words.length > 1 && words[0].length <= 3) return `${words[0]} ${words[1]}`;
  return words[0] ?? name;
}

export interface DayData {
  foodLog: FoodLogEntry[];
  workouts: Workout[];
  goals: NutritionGoals;
}

/** Whether a self-ticking habit is done on a date, from the logged food and workouts. */
export function autoDone(kind: AutoHabit, date: string, d: DayData): boolean {
  if (kind === "workout") return d.workouts.some((w) => w.date === date);
  const entries = d.foodLog.filter((e) => e.date === date);
  const food = sumEntries(entries);
  if (kind === "protein") return d.goals.protein > 0 && food.protein >= d.goals.protein;
  if (kind === "meals") return ["breakfast", "lunch", "dinner"].every((m) => entries.some((e) => e.meal === m));
  // A green day needs a real day of eating — one snack logged isn't "within calories".
  const exercise = d.workouts.filter((w) => w.date === date).reduce((a, w) => a + w.caloriesBurned, 0);
  return food.calories >= d.goals.calories * 0.5 && calorieStatus(food.calories, d.goals.calories + exercise, d.goals.overAllowance) === "good";
}

export function isDue(h: Habit, date: string): boolean {
  if (date.localeCompare(createdKey(h)) < 0) return false;
  return h.days.length === 0 || h.days.includes(fromKey(date).getDay());
}

function createdKey(h: Habit): string {
  const d = new Date(h.createdAt);
  // created today means due from today; history before it isn't counted against you
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** How far along a habit is on a date: count done and whether it's complete. */
export function progress(h: Habit, date: string, log: HabitLog, d: DayData): { count: number; done: boolean } {
  if (h.auto) {
    const done = autoDone(h.auto, date, d);
    return { count: done ? 1 : 0, done };
  }
  const count = log[date]?.[h.id] ?? 0;
  return { count, done: count >= h.target };
}

/**
 * Current streak: due days completed in a row, counting back from today. Today only breaks
 * the streak once it's over — an unticked today just doesn't add to it yet.
 */
export function streak(h: Habit, log: HabitLog, d: DayData, today = todayKey()): number {
  let n = 0;
  let day = today;
  if (isDue(h, day) && !progress(h, day, log, d).done) day = addDays(day, -1);
  for (let i = 0; i < 730; i++) {
    if (day.localeCompare(createdKey(h)) < 0) break;
    if (isDue(h, day)) {
      if (!progress(h, day, log, d).done) break;
      n++;
    }
    day = addDays(day, -1);
  }
  return n;
}

export function bestStreak(h: Habit, log: HabitLog, d: DayData, today = todayKey()): number {
  let best = 0;
  let run = 0;
  for (let day = createdKey(h); day.localeCompare(today) <= 0; day = addDays(day, 1)) {
    if (!isDue(h, day)) continue;
    if (progress(h, day, log, d).done) best = Math.max(best, ++run);
    else if (day !== today) run = 0;
  }
  return best;
}

/** Share of due days completed over the last `days` days (today excluded until done). */
export function completionRate(h: Habit, log: HabitLog, d: DayData, days = 30, today = todayKey()): number | null {
  let due = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const day = addDays(today, -i);
    if (!isDue(h, day)) continue;
    const ok = progress(h, day, log, d).done;
    if (day === today && !ok) continue;
    due++;
    if (ok) done++;
  }
  return due ? done / due : null;
}

export const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function scheduleLabel(h: Habit): string {
  if (h.days.length === 0 || h.days.length === 7) return "Every day";
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const sorted = [...h.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  if (sorted.join() === "1,2,3,4,5") return "Weekdays";
  if (sorted.join() === "6,0") return "Weekends";
  return sorted.map((x) => names[x]).join(", ");
}
