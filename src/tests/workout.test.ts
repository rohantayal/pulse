import { describe, expect, it } from "vitest";
import type { Workout, WorkoutSet } from "../types";
import { bestsFromSets, detectPRs, exerciseBests, exercisesVolume, oneRepMax, previousSets } from "../lib/workout";

const set = (kg: number | null, reps: number | null, done = true): WorkoutSet => ({ id: Math.random().toString(), kg, reps, done });

function workout(startedAt: number, exerciseId: string, sets: WorkoutSet[]): Workout {
  return { id: String(startedAt), name: "W", date: "2026-10-01", startedAt, endedAt: startedAt + 1, caloriesBurned: 0, exercises: [{ id: "e", exerciseId, sets }] };
}

describe("volume", () => {
  it("counts only completed sets with reps", () => {
    expect(exercisesVolume([{ id: "a", exerciseId: "x", sets: [set(100, 5), set(100, 5, false), set(50, null)] }])).toBe(500);
  });
});

describe("oneRepMax", () => {
  it("is the weight itself for a single", () => expect(oneRepMax(100, 1)).toBe(100));
  it("uses Epley for reps", () => expect(oneRepMax(100, 10)).toBeCloseTo(133.33, 1));
});

describe("PR detection", () => {
  const history = [workout(1, "bench", [set(80, 8), set(85, 5)])];
  const bests = exerciseBests(history, "bench");

  it("awards nothing the first time an exercise is done", () => {
    expect(detectPRs(set(20, 10), exerciseBests(history, "squat"))).toEqual([]);
  });
  it("detects a heavier weight", () => {
    expect(detectPRs(set(90, 1), bests)).toContain("weight");
  });
  it("detects a better 1RM / volume without a heavier weight", () => {
    const prs = detectPRs(set(80, 10), bests);
    expect(prs).not.toContain("weight");
    expect(prs).toContain("oneRm");
    expect(prs).toContain("volume");
  });
  it("does not award a PR for matching the old best", () => {
    expect(detectPRs(set(85, 5), bests)).toEqual([]);
  });
  it("tracks reps for body-weight exercises", () => {
    const b = bestsFromSets([set(0, 10)], exerciseBests([], "pullup"));
    expect(detectPRs(set(0, 12), b)).toEqual(["reps"]);
    expect(detectPRs(set(0, 9), b)).toEqual([]);
  });
});

describe("previousSets", () => {
  it("returns the most recent workout's sets for that exercise", () => {
    const h = [workout(1, "bench", [set(60, 10)]), workout(5, "bench", [set(70, 8), set(70, 7)]), workout(3, "bench", [set(65, 9)])];
    expect(previousSets(h, "bench").map((s) => s.kg)).toEqual([70, 70]);
  });
});
