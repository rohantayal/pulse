import type { WeightUnit } from "./units";

/** Standard plates per side, heaviest first, and the usual bar, in each unit. */
export const PLATES: Record<WeightUnit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};
export const BAR: Record<WeightUnit, number> = { kg: 20, lb: 45 };

export interface PlateLoad {
  bar: number;
  /** plates for ONE side, heaviest first */
  perSide: number[];
  /** weight that can't be made with these plates (0 when exact) */
  leftover: number;
  /** the target is lighter than the empty bar */
  belowBar: boolean;
}

/** Which plates to put on each side of the bar for `total` (in the display unit). */
export function platesFor(total: number, unit: WeightUnit, bar = BAR[unit]): PlateLoad {
  if (total < bar) return { bar, perSide: [], leftover: 0, belowBar: true };
  // work in hundredths so 1.25 kg plates don't pick up floating-point dust
  let side = Math.round(((total - bar) / 2) * 100);
  const perSide: number[] = [];
  for (const p of PLATES[unit]) {
    const c = Math.round(p * 100);
    while (side >= c) {
      perSide.push(p);
      side -= c;
    }
  }
  return { bar, perSide, leftover: (side * 2) / 100, belowBar: false };
}

/** Round to what a gym can actually load: 2.5 kg / 5 lb steps. */
export function roundToLoadable(w: number, unit: WeightUnit): number {
  const step = unit === "kg" ? 2.5 : 5;
  return Math.round(w / step) * step;
}

/**
 * A simple warm-up ramp towards `working` (display unit): bar × 10, then ~50% × 8, 70% × 5,
 * 85% × 3, dropping any step that rounds to the same weight as the one before or reaches
 * the working weight itself.
 */
export function warmupRamp(working: number, unit: WeightUnit, barbell: boolean): { weight: number; reps: number }[] {
  const steps: [number, number][] = [
    [0.5, 8],
    [0.7, 5],
    [0.85, 3],
  ];
  const out: { weight: number; reps: number }[] = [];
  const bar = BAR[unit];
  if (barbell && working > bar * 1.6) out.push({ weight: bar, reps: 10 });
  for (const [pct, reps] of steps) {
    let w = roundToLoadable(working * pct, unit);
    if (barbell) w = Math.max(w, bar);
    if (w <= 0 || w >= working) continue;
    if (out.length && w <= out[out.length - 1].weight) continue;
    out.push({ weight: w, reps });
  }
  return out;
}
