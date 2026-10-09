import type { PrKind, Workout, WorkoutExercise, WorkoutSet } from "../types";

export function isCountable(s: WorkoutSet): boolean {
  return s.done && s.reps != null && s.reps > 0;
}

export function setVolume(s: WorkoutSet): number {
  return isCountable(s) ? (s.kg ?? 0) * (s.reps ?? 0) : 0;
}

export function exercisesVolume(exs: WorkoutExercise[]): number {
  return exs.reduce((acc, e) => acc + e.sets.reduce((a, s) => a + setVolume(s), 0), 0);
}

export function completedSets(exs: WorkoutExercise[]): number {
  return exs.reduce((acc, e) => acc + e.sets.filter((s) => s.done).length, 0);
}

/** Epley estimated one-rep max */
export function oneRepMax(kg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return kg;
  return kg * (1 + reps / 30);
}

export interface Bests {
  weight: number;
  oneRm: number;
  volume: number;
  /** Best reps (used for body-weight exercises where kg is 0/empty) */
  reps: number;
  /** Has this exercise ever been completed before? */
  any: boolean;
}

export const NO_BESTS: Bests = { weight: 0, oneRm: 0, volume: 0, reps: 0, any: false };

export function bestsFromSets(sets: WorkoutSet[], start: Bests = NO_BESTS): Bests {
  const b = { ...start };
  for (const s of sets) {
    if (!isCountable(s)) continue;
    const kg = s.kg ?? 0;
    const reps = s.reps ?? 0;
    b.any = true;
    b.weight = Math.max(b.weight, kg);
    b.oneRm = Math.max(b.oneRm, oneRepMax(kg, reps));
    b.volume = Math.max(b.volume, kg * reps);
    if (kg === 0) b.reps = Math.max(b.reps, reps);
  }
  return b;
}

/** All-time bests for an exercise across finished workouts. */
export function exerciseBests(history: Workout[], exerciseId: string): Bests {
  let b = NO_BESTS;
  for (const w of history) {
    for (const e of w.exercises) {
      if (e.exerciseId === exerciseId) b = bestsFromSets(e.sets, b);
    }
  }
  return b;
}

/**
 * Which records does this set break? Only awarded when the exercise has history —
 * the very first time you do an exercise everything would be a "record", which is noise.
 */
export function detectPRs(set: WorkoutSet, bests: Bests): PrKind[] {
  if (!bests.any || !isCountable(set)) return [];
  const kg = set.kg ?? 0;
  const reps = set.reps ?? 0;
  const prs: PrKind[] = [];
  const EPS = 1e-9;
  if (kg > 0) {
    if (kg > bests.weight + EPS) prs.push("weight");
    if (oneRepMax(kg, reps) > bests.oneRm + EPS) prs.push("oneRm");
    if (kg * reps > bests.volume + EPS) prs.push("volume");
  } else if (reps > bests.reps) {
    prs.push("reps");
  }
  return prs;
}

export const PR_LABEL: Record<PrKind, string> = {
  weight: "Heaviest weight",
  oneRm: "Best est. 1RM",
  volume: "Best set volume",
  reps: "Most reps",
};

/** Sets from the most recent finished workout that included this exercise. */
export function previousSets(history: Workout[], exerciseId: string): WorkoutSet[] {
  let latest: Workout | undefined;
  for (const w of history) {
    if (!w.exercises.some((e) => e.exerciseId === exerciseId)) continue;
    if (!latest || w.startedAt > latest.startedAt) latest = w;
  }
  if (!latest) return [];
  const sets: WorkoutSet[] = [];
  for (const e of latest.exercises) {
    if (e.exerciseId === exerciseId) sets.push(...e.sets.filter(isCountable));
  }
  return sets;
}

export function formatSet(s: Pick<WorkoutSet, "kg" | "reps">): string {
  if (s.reps == null) return "–";
  if (!s.kg) return `${s.reps} reps`;
  return `${+s.kg.toFixed(2)}kg × ${s.reps}`;
}

/**
 * Strength training ≈ MET 5. kcal = MET × 3.5 × kg / 200 per minute.
 */
export function estimateWorkoutCalories(durationMs: number, bodyKg = 70): number {
  const minutes = durationMs / 60_000;
  return Math.round(5 * 3.5 * bodyKg / 200 * minutes);
}
