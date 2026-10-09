import { describe, expect, it } from "vitest";
import { bmr, buildPlan, goalBlocked, maxPace, type Profile } from "../lib/plan";

const man: Profile = { sex: "male", age: 30, heightCm: 175, weightKg: 80, activity: "moderate", goal: "maintain", pace: 0.5, workoutsPerWeek: 4 };

describe("plan", () => {
  it("uses Mifflin–St Jeor", () => {
    expect(bmr(man)).toBeCloseTo(10 * 80 + 6.25 * 175 - 5 * 30 + 5); // 1748.75
    expect(bmr({ ...man, sex: "female" })).toBeCloseTo(1748.75 - 166);
  });

  it("maintenance = BMR × activity, rounded to 5", () => {
    const p = buildPlan(man);
    expect(p.calories).toBe(Math.round((1748.75 * 1.55) / 5) * 5); // 2710
  });

  it("0.5 kg/week loss is ~550 kcal under maintenance with higher protein", () => {
    const keep = buildPlan(man).calories;
    const lose = buildPlan({ ...man, goal: "lose", pace: 0.5 });
    expect(keep - lose.calories).toBeGreaterThanOrEqual(545);
    expect(keep - lose.calories).toBeLessThanOrEqual(555);
    expect(lose.protein).toBe(160); // 2 g/kg
  });

  it("macros add back up to the calorie target", () => {
    const p = buildPlan({ ...man, goal: "lose", pace: 0.5 });
    expect(Math.abs(p.protein * 4 + p.carbs * 4 + p.fat * 9 - p.calories)).toBeLessThan(15);
  });

  it("never goes below the calorie floor", () => {
    const small: Profile = { ...man, sex: "female", age: 45, heightCm: 152, weightKg: 52, activity: "sedentary", goal: "lose", pace: 1 };
    const p = buildPlan(small);
    expect(p.calories).toBeGreaterThanOrEqual(1200);
    expect(p.notes.length).toBeGreaterThan(0);
  });

  it("caps loss at ~1% of body weight per week", () => {
    expect(maxPace("lose", 60)).toBe(0.5);
    expect(maxPace("lose", 120)).toBe(1);
  });

  it("won't plan a deficit for under-18s or underweight people", () => {
    expect(goalBlocked("lose", { age: 16, heightCm: 170, weightKg: 70 })).not.toBeNull();
    expect(goalBlocked("lose", { age: 25, heightCm: 180, weightKg: 55 })).not.toBeNull(); // BMI 17
    expect(goalBlocked("lose", { age: 25, heightCm: 175, weightKg: 80 })).toBeNull();
    const p = buildPlan({ ...man, age: 16, goal: "lose" });
    expect(p.calories).toBe(buildPlan({ ...man, age: 16 }).calories);
  });
});
