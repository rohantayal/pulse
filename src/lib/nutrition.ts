import type { FoodLogEntry, Macros, WeightEntry } from "../types";

export const ZERO: Macros = { calories: 0, carbs: 0, protein: 0, fat: 0 };

export function scale(m: Macros, k: number): Macros {
  return { calories: m.calories * k, carbs: m.carbs * k, protein: m.protein * k, fat: m.fat * k };
}

export function add(a: Macros, b: Macros): Macros {
  return {
    calories: a.calories + b.calories,
    carbs: a.carbs + b.carbs,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
  };
}

export function entryMacros(e: FoodLogEntry): Macros {
  return scale(e.per, e.servings);
}

export function sumEntries(entries: FoodLogEntry[]): Macros {
  return entries.reduce((acc, e) => add(acc, entryMacros(e)), ZERO);
}

/** kcal from macros (4/4/9) — used to sanity check goals */
export function macroCalories(m: Pick<Macros, "carbs" | "protein" | "fat">): number {
  return m.carbs * 4 + m.protein * 4 + m.fat * 9;
}

/** Calories burned walking. ~0.04 kcal per step for a 70 kg person, scaled by body weight. */
export function stepCalories(steps: number, bodyKg = 70): number {
  return steps * 0.04 * (bodyKg / 70);
}

/** Most recent body weight logged on or before `date`. */
export function latestWeight(weights: WeightEntry[], onOrBefore: string): number | undefined {
  let found: WeightEntry | undefined;
  for (const w of weights) if (w.date <= onOrBefore && (!found || w.date > found.date)) found = w;
  return found?.kg;
}

/** Servings from an amount typed as servings or grams. Returns null when grams can't be converted. */
export function toServings(qty: number, unit: "serving" | "g", gramsPerServing?: number): number | null {
  if (unit === "serving") return qty;
  return gramsPerServing ? qty / gramsPerServing : null;
}

/** "150 g" for weight entries, "2 × 1 medium (40 g)" for servings. */
export function amountLabel(e: { servings: number; grams?: number; serving: string }): string {
  if (e.grams != null) return `${round(e.grams, 1)} g`;
  return `${round(e.servings, 2)} × ${e.serving}`;
}

function round(n: number, dp: number) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
