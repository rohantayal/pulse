import { describe, expect, it } from "vitest";
import type { FoodLogEntry, WeightEntry } from "../types";
import { weeklyCheckin, weightTrend } from "../lib/checkin";
import { addDays } from "../lib/date";

const today = "2026-11-14";
const goals = { calories: 2000, carbs: 200, protein: 150, fat: 67 };
/** weigh-ins every 3 days for 3 weeks, changing `perWeek` kg per week */
const weighIns = (start: number, perWeek: number): WeightEntry[] =>
  Array.from({ length: 7 }, (_, i) => ({ date: addDays(today, -18 + i * 3), kg: start + (perWeek * (i * 3)) / 7 }));
const eaten = (kcal: number, days = 12): FoodLogEntry[] =>
  Array.from({ length: days }, (_, i) => ({
    id: String(i), date: addDays(today, -1 - i), meal: "lunch", foodId: "x", name: "x", serving: "1", servings: 1,
    per: { calories: kcal, carbs: 0, protein: 0, fat: 0 }, createdAt: 1,
  }));
const lose = { goal: "lose" as const, pace: 0.5, sex: "male" as const };

describe("weightTrend", () => {
  it("fits kg per week", () => {
    expect(weightTrend(weighIns(80, -0.5), today)!.rate).toBeCloseTo(-0.5);
  });
  it("needs enough points over enough days", () => {
    expect(weightTrend(weighIns(80, -0.5).slice(-3), today)).toBeNull(); // only 6 days apart
  });
});

describe("weeklyCheckin", () => {
  it("asks for data first", () => {
    expect(weeklyCheckin({ weights: [], foodLog: [], goals, profile: lose, today }).kind).toBe("need-data");
  });
  it("is on track when the pace matches", () => {
    expect(weeklyCheckin({ weights: weighIns(80, -0.45), foodLog: eaten(2000), goals, profile: lose, today }).kind).toBe("on-track");
  });
  it("suggests trimming when losing too slowly but eating to target", () => {
    const c = weeklyCheckin({ weights: weighIns(80, -0.1), foodLog: eaten(2020), goals, profile: lose, today });
    expect(c.kind).toBe("adjust");
    expect(c.delta).toBe(-250); // 0.4 kg/week off ≈ 440 kcal, capped at 250
    expect(c.suggested).toBe(1750);
  });
  it("says eat to target first when logs show you're well over", () => {
    expect(weeklyCheckin({ weights: weighIns(80, 0), foodLog: eaten(2400), goals, profile: lose, today }).kind).toBe("eat-to-target");
  });
  it("suggests eating more when losing too fast", () => {
    const c = weeklyCheckin({ weights: weighIns(80, -0.8), foodLog: eaten(2000), goals, profile: lose, today });
    expect(c.kind).toBe("adjust");
    expect(c.delta).toBeGreaterThan(0);
    expect(c.title).toMatch(/^Eat/);
  });
  it("won't go below the safe floor", () => {
    const c = weeklyCheckin({ weights: weighIns(80, 0), foodLog: eaten(1600), goals: { ...goals, calories: 1600 }, profile: lose, today });
    expect(c.suggested).toBe(1500);
  });
});
