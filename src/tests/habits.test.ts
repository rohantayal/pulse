import { describe, expect, it } from "vitest";
import type { FoodLogEntry, Habit, HabitLog, Workout } from "../types";
import { autoDone, bestStreak, completionRate, habitEmoji, isDue, progress, scheduleLabel, shortName, streak, type DayData } from "../lib/habits";

const created = new Date(2026, 9, 1).getTime(); // 1 Oct 2026, a Thursday
const habit = (p: Partial<Habit> = {}): Habit => ({ id: "h", name: "Read", target: 1, days: [], createdAt: created, ...p });
const empty: DayData = { foodLog: [], workouts: [], goals: { calories: 2000, protein: 150, carbs: 200, fat: 70 } };
const food = (date: string, meal: string, calories: number, protein = 0): FoodLogEntry => ({
  id: Math.random().toString(), date, meal, foodId: "x", name: "x", serving: "1", servings: 1, per: { calories, carbs: 0, protein, fat: 0 }, createdAt: 1,
});

describe("habits", () => {
  it("is only due on its scheduled days, from the day it was created", () => {
    const mwf = habit({ days: [1, 3, 5] });
    expect(isDue(mwf, "2026-10-05")).toBe(true); // Monday
    expect(isDue(mwf, "2026-10-06")).toBe(false); // Tuesday
    expect(isDue(habit(), "2026-09-30")).toBe(false); // before it existed
    expect(scheduleLabel(mwf)).toBe("Mon, Wed, Fri");
    expect(scheduleLabel(habit({ days: [1, 2, 3, 4, 5] }))).toBe("Weekdays");
  });

  it("counts toward a target", () => {
    const water = habit({ target: 8, unit: "glasses" });
    const log: HabitLog = { "2026-10-02": { h: 5 }, "2026-10-03": { h: 8 } };
    expect(progress(water, "2026-10-02", log, empty)).toEqual({ count: 5, done: false });
    expect(progress(water, "2026-10-03", log, empty).done).toBe(true);
  });

  it("streaks skip days the habit isn't due, and today doesn't break it until it's over", () => {
    const h = habit({ days: [1, 3, 5] }); // Mon Wed Fri
    const log: HabitLog = { "2026-10-02": { h: 1 }, "2026-10-05": { h: 1 }, "2026-10-07": { h: 1 } }; // Fri, Mon, Wed
    expect(streak(h, log, empty, "2026-10-08")).toBe(3); // Thursday: not due
    expect(streak(h, log, empty, "2026-10-09")).toBe(3); // Friday, not ticked yet
    expect(streak(h, log, empty, "2026-10-10")).toBe(0); // Friday was missed
    expect(bestStreak(h, log, empty, "2026-10-10")).toBe(3);
  });

  it("completion rate ignores today until it's done", () => {
    const log: HabitLog = { "2026-10-01": { h: 1 }, "2026-10-02": { h: 1 } };
    expect(completionRate(habit(), log, empty, 30, "2026-10-04")).toBeCloseTo(2 / 3);
  });

  it("ticks auto habits from food and workouts", () => {
    const w: Workout = { id: "w", name: "W", date: "2026-10-02", startedAt: 1, endedAt: 2, caloriesBurned: 300, exercises: [] };
    const d: DayData = {
      ...empty,
      workouts: [w],
      foodLog: [food("2026-10-02", "breakfast", 600, 50), food("2026-10-02", "lunch", 700, 60), food("2026-10-02", "dinner", 600, 45), food("2026-10-03", "snacks", 150)],
    };
    expect(autoDone("workout", "2026-10-02", d)).toBe(true);
    expect(autoDone("workout", "2026-10-03", d)).toBe(false);
    expect(autoDone("protein", "2026-10-02", d)).toBe(true); // 155 ≥ 150
    expect(autoDone("meals", "2026-10-02", d)).toBe(true);
    expect(autoDone("calories", "2026-10-02", d)).toBe(true); // 1900 within 2000 + 300
    expect(autoDone("calories", "2026-10-03", d)).toBe(false); // one snack isn't a day of eating
  });
});

describe("habit icons and labels", () => {
  it("guesses an emoji from the name, and uses yours when set", () => {
    expect(habitEmoji({ name: "Drink water" })).toBe("💧");
    expect(habitEmoji({ name: "Read 10 pages" })).toBe("📖");
    expect(habitEmoji({ name: "Something else" })).toBe("⭐");
    expect(habitEmoji({ name: "Drink water", emoji: "🥤" })).toBe("🥤");
    expect(habitEmoji({ name: "Work out", auto: "workout" })).toBe("💪");
  });
  it("shortens names for under a ring", () => {
    expect(shortName("Drink water")).toBe("Drink");
    expect(shortName("No sugar")).toBe("No sugar");
    expect(shortName("Meditate")).toBe("Meditate");
    expect(shortName("Log every meal", "meals")).toBe("Meals");
    expect(shortName("My meals", "meals")).toBe("My meals"); // renamed: use their words
  });
});
