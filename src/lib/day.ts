import type { FoodLogEntry, Macros, Workout } from "../types";
import { sumEntries } from "./nutrition";

export interface DayStats {
  food: Macros;
  /** Calories burned in workouts that day */
  exercise: number;
  workouts: Workout[];
  exerciseMinutes: number;
}

export function dayStats(date: string, data: { foodLog: FoodLogEntry[]; workouts: Workout[] }): DayStats {
  const food = sumEntries(data.foodLog.filter((e) => e.date === date));
  const workouts = data.workouts.filter((w) => w.date === date).sort((a, b) => a.startedAt - b.startedAt);
  const exercise = workouts.reduce((a, w) => a + w.caloriesBurned, 0);
  const exerciseMinutes = Math.round(workouts.reduce((a, w) => a + (w.endedAt - w.startedAt), 0) / 60_000);
  return { food, exercise, workouts, exerciseMinutes };
}
