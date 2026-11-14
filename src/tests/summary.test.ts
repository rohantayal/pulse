import { describe, expect, it } from "vitest";
import type { Workout, WorkoutSet } from "../types";
import { changeLabel, workoutSummary } from "../lib/summary";

const set = (kg: number, reps: number, pr?: WorkoutSet["pr"]): WorkoutSet => ({ id: Math.random().toString(), kg, reps, done: true, pr });
const w = (i: number, routineId: string | undefined, ex: [string, WorkoutSet[]][], mins = 50): Workout => ({
  id: "w" + i, name: "Push", routineId, date: "2026-11-0" + i, startedAt: i * 1e9, endedAt: i * 1e9 + mins * 60000, caloriesBurned: 300,
  exercises: ex.map(([exerciseId, sets], j) => ({ id: `e${i}${j}`, exerciseId, sets })),
});

describe("workout summary", () => {
  const prev = w(1, "push", [["bench", [set(60, 8), set(60, 8)]], ["curl", [set(12, 10)]]], 50);
  const other = w(2, "full", [["bench", [set(40, 15)]]], 30);
  const today = w(3, "push", [["bench", [set(62.5, 8, ["weight"]), set(60, 8)]], ["curl", [set(12, 11)]], ["dips", [set(0, 10)]]], 55);

  it("compares with the last session of the same routine", () => {
    const s = workoutSummary(today, [prev, other, today]);
    expect(s.previous?.id).toBe("w1");
    expect(s.prCount).toBe(1);
    expect(s.volumeDeltaPct).toBeCloseTo(((62.5 * 8 + 480 + 132) - (960 + 120)) / (960 + 120) * 100, 5);
    expect(s.durationDeltaMs).toBe(5 * 60000);
  });

  it("describes each exercise's change vs the last time it was done", () => {
    const s = workoutSummary(today, [prev, other, today]);
    const bench = s.exercises.find((e) => e.exerciseId === "bench")!;
    expect(bench.lastBest?.kg).toBe(60); // last Push session, not the lighter Full Body one
    expect(changeLabel(bench, "kg")).toBe("+2.5 kg");
    expect(changeLabel(s.exercises.find((e) => e.exerciseId === "curl")!, "kg")).toBe("+1 rep");
    expect(changeLabel(s.exercises.find((e) => e.exerciseId === "dips")!, "kg")).toBe("First time");
  });

  it("has no routine comparison for an empty workout", () => {
    expect(workoutSummary(w(4, undefined, [["bench", [set(50, 5)]]]), [prev]).volumeDeltaPct).toBeNull();
  });
});
