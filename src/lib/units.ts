/**
 * Weights are always stored in kg; pounds exist only on screen. Converting at the edges keeps
 * PRs, volume and calorie maths identical whichever unit you pick, and lets you switch any time.
 */
export type WeightUnit = "kg" | "lb";

export const LB_PER_KG = 2.20462262185;

/** kg → the display unit, rounded for display/input (2 dp so 135 lb round-trips exactly). */
export function toUnit(kg: number, unit: WeightUnit): number {
  const v = unit === "lb" ? kg * LB_PER_KG : kg;
  return Math.round(v * 100) / 100;
}

/** A value typed in the display unit → kg for storage. */
export function fromUnit(v: number, unit: WeightUnit): number {
  return unit === "lb" ? v / LB_PER_KG : v;
}

export function fmtWeight(kg: number, unit: WeightUnit, dp = 1): string {
  const v = toUnit(kg, unit);
  return `${(Math.round(v * 10 ** dp) / 10 ** dp).toLocaleString(undefined, { maximumFractionDigits: dp })} ${unit}`;
}
