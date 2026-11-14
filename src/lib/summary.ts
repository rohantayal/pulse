import type { PrKind, Workout, WorkoutSet } from "../types";
import { completedSets, exercisesVolume, formatSet, isCountable, oneRepMax, previousSets } from "./workout";
import { toUnit, type WeightUnit } from "./units";

export interface ExerciseCompare {
  exerciseId: string;
  /** today's best set (highest est. 1RM, or most reps for body-weight moves) */
  best: WorkoutSet;
  /** best set last time — in this routine if it was in the last session, otherwise anywhere */
  lastBest?: WorkoutSet;
  /** change in kg on the best set (null when it's a reps-only exercise) */
  deltaKg: number | null;
  deltaReps: number;
  sets: number;
  prs: PrKind[];
}

export interface WorkoutSummaryData {
  /** the last session of the same routine, if any */
  previous?: Workout;
  durationMs: number;
  volume: number;
  sets: number;
  prCount: number;
  /** % change in volume vs the previous session of this routine */
  volumeDeltaPct: number | null;
  durationDeltaMs: number | null;
  exercises: ExerciseCompare[];
}

const score = (s: WorkoutSet) => ((s.kg ?? 0) > 0 ? oneRepMax(s.kg ?? 0, s.reps ?? 0) : (s.reps ?? 0) / 1000);
const bestOf = (sets: WorkoutSet[]) => sets.reduce<WorkoutSet | undefined>((b, s) => (!b || score(s) > score(b) ? s : b), undefined);

/** How a finished workout compares with last time. `history` may include `w`; it's ignored. */
export function workoutSummary(w: Workout, history: Workout[]): WorkoutSummaryData {
  const earlier = history.filter((x) => x.id !== w.id && x.startedAt < w.startedAt);
  const previous = w.routineId
    ? earlier.filter((x) => x.routineId === w.routineId).sort((a, b) => b.startedAt - a.startedAt)[0]
    : undefined;
  const volume = exercisesVolume(w.exercises);
  const prevVolume = previous ? exercisesVolume(previous.exercises) : 0;

  const exercises: ExerciseCompare[] = [];
  for (const e of w.exercises) {
    const done = e.sets.filter(isCountable);
    const best = bestOf(done);
    if (!best) continue;
    // same rule as the kg/reps hints: last time in this routine, else last time anywhere
    const inRoutine = previous ? previousSets([previous], e.exerciseId) : [];
    const lastBest = bestOf(inRoutine.length ? inRoutine : previousSets(earlier, e.exerciseId));
    const bodyweight = !(best.kg ?? 0) && !(lastBest?.kg ?? 0);
    exercises.push({
      exerciseId: e.exerciseId,
      best,
      lastBest,
      deltaKg: lastBest && !bodyweight ? (best.kg ?? 0) - (lastBest.kg ?? 0) : null,
      deltaReps: lastBest ? (best.reps ?? 0) - (lastBest.reps ?? 0) : 0,
      sets: done.length,
      prs: [...new Set(done.flatMap((s) => s.pr ?? []))],
    });
  }

  return {
    previous,
    durationMs: w.endedAt - w.startedAt,
    volume,
    sets: completedSets(w.exercises),
    prCount: w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.pr?.length).length, 0),
    volumeDeltaPct: previous && prevVolume > 0 ? ((volume - prevVolume) / prevVolume) * 100 : null,
    durationDeltaMs: previous ? w.endedAt - w.startedAt - (previous.endedAt - previous.startedAt) : null,
    exercises,
  };
}

/** "+2.5 kg", "+1 rep", "same as last time", "first time" */
export function changeLabel(c: ExerciseCompare, unit: WeightUnit): string {
  if (!c.lastBest) return "First time";
  if (c.deltaKg != null && Math.abs(c.deltaKg) > 0.001) {
    const v = +toUnit(Math.abs(c.deltaKg), unit).toFixed(1);
    return `${c.deltaKg > 0 ? "+" : "−"}${v} ${unit}`;
  }
  if (c.deltaReps !== 0) return `${c.deltaReps > 0 ? "+" : "−"}${Math.abs(c.deltaReps)} rep${Math.abs(c.deltaReps) === 1 ? "" : "s"}`;
  return "Same as last time";
}

/** Plain-text summary for sharing. */
export function shareText(w: Workout, s: WorkoutSummaryData, names: Map<string, string>, unit: WeightUnit, duration: string): string {
  const lines = [
    `🏋️ ${w.name} — ${duration} · ${Math.round(toUnit(s.volume, unit)).toLocaleString()} ${unit} · ${s.sets} sets${s.prCount ? ` · ${s.prCount} PR${s.prCount > 1 ? "s" : ""} 🏆` : ""}`,
    ...s.exercises.map((c) => `• ${names.get(c.exerciseId) ?? "Exercise"}: ${formatSet(c.best, unit)}${c.lastBest ? ` (${changeLabel(c, unit)})` : ""}`),
    "Logged with Pulse",
  ];
  return lines.join("\n");
}
