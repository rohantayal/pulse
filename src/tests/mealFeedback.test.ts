import { describe, expect, it } from "vitest";
import { mealFeedback } from "../lib/mealFeedback";

const base = { goal: 2200, restOfDay: 0, budget: 2200, allowance: 100, snack: false };

describe("mealFeedback", () => {
  it("calls out a 4-slice pizza (1,140 kcal) as a very heavy meal", () => {
    const f = mealFeedback({ ...base, meal: { calories: 1140, carbs: 144, protein: 48, fat: 41.6 } })!;
    expect(f.tone).toBe("bad");
    expect(f.title).toBe("Very heavy meal");
    expect(f.notes[0].text).toContain("1,140 kcal");
  });

  it("praises a balanced, protein-rich main meal", () => {
    // 2 roti + dal + 100 g paneer + salad ≈ 700 kcal
    const f = mealFeedback({ ...base, meal: { calories: 700, carbs: 80, protein: 35, fat: 26 } })!;
    expect(f.tone).toBe("good");
    expect(f.title).toBe("Solid meal");
    expect(f.notes.some((n) => n.text.startsWith("Great protein"))).toBe(true);
  });

  it("flags high fat and low protein", () => {
    const f = mealFeedback({ ...base, meal: { calories: 600, carbs: 60, protein: 8, fat: 36 } })!;
    expect(f.tone).toBe("warn");
    expect(f.notes.map((n) => n.text).join(" ")).toMatch(/High in fat/);
    expect(f.notes.map((n) => n.text).join(" ")).toMatch(/Low on protein/);
  });

  it("flags a carb-heavy meal", () => {
    const f = mealFeedback({ ...base, meal: { calories: 500, carbs: 100, protein: 10, fat: 6 } })!;
    expect(f.notes.some((n) => n.text.startsWith("Carb-heavy"))).toBe(true);
  });

  it("treats a 700 kcal snack as heavy", () => {
    const f = mealFeedback({ ...base, snack: true, meal: { calories: 700, carbs: 80, protein: 10, fat: 38 } })!;
    expect(f.tone).toBe("bad");
    expect(f.title).toBe("Heavy snack");
  });

  it("is fine with a small snack", () => {
    const f = mealFeedback({ ...base, snack: true, meal: { calories: 150, carbs: 20, protein: 6, fat: 5 } })!;
    expect(f.tone).toBe("good");
  });

  it("warns when the meal pushes the day over goal + allowance", () => {
    const f = mealFeedback({ ...base, restOfDay: 1900, meal: { calories: 600, carbs: 70, protein: 30, fat: 20 } })!;
    expect(f.tone).toBe("bad");
    expect(f.notes[0].text).toContain("300 kcal over");
  });

  it("returns nothing for an empty meal", () => {
    expect(mealFeedback({ ...base, meal: { calories: 0, carbs: 0, protein: 0, fat: 0 } })).toBeNull();
  });
});
