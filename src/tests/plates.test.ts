import { describe, expect, it } from "vitest";
import { platesFor, roundToLoadable, warmupRamp } from "../lib/plates";

describe("platesFor", () => {
  it("loads 100 kg as 25+15 per side on a 20 kg bar", () => {
    expect(platesFor(100, "kg")).toMatchObject({ perSide: [25, 15], leftover: 0, belowBar: false });
  });
  it("handles small plates exactly", () => {
    expect(platesFor(62.5, "kg").perSide).toEqual([20, 1.25]);
    expect(platesFor(225, "lb").perSide).toEqual([45, 45]);
  });
  it("reports leftovers and weights below the bar", () => {
    expect(platesFor(61, "kg").leftover).toBeCloseTo(1);
    expect(platesFor(15, "kg").belowBar).toBe(true);
    expect(platesFor(20, "kg").perSide).toEqual([]);
  });
});

describe("warm-ups", () => {
  it("rounds to loadable steps", () => {
    expect(roundToLoadable(51.3, "kg")).toBe(52.5);
    expect(roundToLoadable(137, "lb")).toBe(135);
  });
  it("ramps up to a barbell working weight", () => {
    expect(warmupRamp(100, "kg", true)).toEqual([
      { weight: 20, reps: 10 },
      { weight: 50, reps: 8 },
      { weight: 70, reps: 5 },
      { weight: 85, reps: 3 },
    ]);
  });
  it("skips duplicate steps for light dumbbell work", () => {
    const r = warmupRamp(10, "kg", false);
    expect(r.map((x) => x.weight)).toEqual([5, 7.5]);
  });
});
