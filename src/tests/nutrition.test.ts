import { describe, expect, it } from "vitest";
import { calorieStatus, macroSplit } from "../lib/nutrition";

describe("calorieStatus", () => {
  it("is green under the goal and within the allowance, red beyond it", () => {
    expect(calorieStatus(1800, 2000)).toBe("good");
    expect(calorieStatus(2100, 2000)).toBe("good"); // exactly +100
    expect(calorieStatus(2101, 2000)).toBe("over");
    expect(calorieStatus(2050, 2000, 0)).toBe("over"); // strict
    expect(calorieStatus(2150, 2000, 200)).toBe("good");
  });
});

describe("macroSplit", () => {
  it("gives each macro's share of the meal's calories", () => {
    const s = macroSplit({ carbs: 50, protein: 25, fat: 10 }); // 200 + 100 + 90 = 390 kcal
    expect(s.carbs).toBeCloseTo(51.3, 1);
    expect(s.protein).toBeCloseTo(25.6, 1);
    expect(s.fat).toBeCloseTo(23.1, 1);
    expect(s.carbs + s.protein + s.fat).toBeCloseTo(100);
  });
  it("is all zero for an empty meal", () => {
    expect(macroSplit({ carbs: 0, protein: 0, fat: 0 })).toEqual({ carbs: 0, protein: 0, fat: 0 });
  });
});
