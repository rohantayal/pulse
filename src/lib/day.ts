import type { FoodLogEntry, Macros, StepEntry, WeightEntry, Workout } from "../types";
import { latestWeight, stepCalories, sumEntries } from "./nutrition";

export interface DayStats {
  food: Macros;
  workoutCalories: number;
  stepCalories: number;
  exercise: number;
  steps: number;
  workouts: Workout[];
  exerciseMinutes: number;
}

export function dayStats(
  date: string,
  data: { foodLog: FoodLogEntry[]; workouts: Workout[]; steps: StepEntry[]; weights: WeightEntry[] },
): DayStats {
  const food = sumEntries(data.foodLog.filter((e) => e.date === date));
  const workouts = data.workouts.filter((w) => w.date === date).sort((a, b) => a.startedAt - b.startedAt);
  const workoutCalories = workouts.reduce((a, w) => a + w.caloriesBurned, 0);
  const exerciseMinutes = Math.round(workouts.reduce((a, w) => a + (w.endedAt - w.startedAt), 0) / 60_000);
  const steps = data.steps.find((s) => s.date === date)?.steps ?? 0;
  const sc = Math.round(stepCalories(steps, latestWeight(data.weights, date) ?? 70));
  return { food, workoutCalories, stepCalories: sc, exercise: workoutCalories + sc, steps, workouts, exerciseMinutes };
}
