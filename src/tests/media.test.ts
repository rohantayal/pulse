import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { PRELOADED_EXERCISES } from "../data/exercises";
import { EXERCISE_MEDIA } from "../data/exerciseMedia";

describe("exercise photos", () => {
  it("every photo the app refers to is bundled", () => {
    const missing: string[] = [];
    for (const key of Object.keys(EXERCISE_MEDIA)) {
      for (const i of [0, 1]) {
        const f = resolve(__dirname, "../../public/exercise-img", `${key}-${i}.webp`);
        if (!existsSync(f)) missing.push(`${key}-${i}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("covers every built-in exercise except burpee, with instructions", () => {
    const without = PRELOADED_EXERCISES.map((e) => e.id.slice(4)).filter((k) => !EXERCISE_MEDIA[k]);
    expect(without).toEqual(["burpee"]);
    for (const m of Object.values(EXERCISE_MEDIA)) expect(m.steps.length).toBeGreaterThan(0);
  });
});
