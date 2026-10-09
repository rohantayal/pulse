import { describe, expect, it } from "vitest";
import { PRELOADED_EXERCISES } from "../data/exercises";
import { PATTERNS, PRELOADED_PATTERN_IDS, lerpPose, patternFor, solve, type Skeleton } from "../lib/motion";
import { musclesFor, primaryLabel } from "../lib/muscles";

const FLOOR = 137;

describe("exercise animations", () => {
  it("has a specific movement for every built-in exercise", () => {
    const missing = PRELOADED_EXERCISES.filter((e) => !PRELOADED_PATTERN_IDS.includes(e.id.slice(4))).map((e) => e.name);
    expect(missing).toEqual([]);
  });

  it("falls back to a sensible movement for custom exercises", () => {
    expect(patternFor({ id: "custom:1", muscle: "Biceps" })).toBe("curl");
    expect(patternFor({ id: "custom:2", muscle: "Other" })).toBe("idle");
  });

  for (const [name, p] of Object.entries(PATTERNS)) {
    it(`${name}: stays in the frame and never goes through the floor`, () => {
      for (const k of [0, 0.25, 0.5, 0.75, 1]) {
        const sk: Skeleton = solve(lerpPose(p.A, p.B, k), p.anchor, p.at, (p as { scale?: number }).scale);
        for (const [joint, [x, y]] of Object.entries(sk)) {
          expect(Number.isFinite(x) && Number.isFinite(y), `${joint} finite`).toBe(true);
          expect(y, `${name} ${joint} at k=${k} below floor`).toBeLessThanOrEqual(FLOOR + 3);
          expect(x, `${name} ${joint} at k=${k} off-frame`).toBeGreaterThanOrEqual(0);
          expect(x, `${name} ${joint} at k=${k} off-frame`).toBeLessThanOrEqual(200);
        }
      }
    });
  }
});

describe("muscles", () => {
  it("names the main muscles", () => {
    expect(primaryLabel({ id: "pre:crunch", muscle: "Abs" })).toBe("Abdominals");
    expect(primaryLabel({ id: "pre:lateral-raise-db", muscle: "Shoulders" })).toBe("Side delts");
    expect(musclesFor({ id: "pre:deadlift-bb", muscle: "Back" }).primary).toContain("lowerBack");
  });
});
