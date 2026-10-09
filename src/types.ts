// ---------- Nutrition ----------

/** Meal section id. The four defaults use these ids; meals you add get "meal:<uuid>". */
export type Meal = string;

export interface MealDef {
  id: Meal;
  label: string;
}

export const DEFAULT_MEALS: MealDef[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snacks", label: "Snacks" },
];

export interface Macros {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

/** A food, with nutrition for ONE serving. */
export interface Food extends Macros {
  id: string;
  name: string;
  brand?: string;
  /** Human readable serving, e.g. "1 roti (40 g)" */
  serving: string;
  /** Grams in one serving. Optional — otherwise read from `serving` ("… (40 g)"). */
  grams?: number;
  category?: string;
  custom?: boolean;
}

export interface FoodLogEntry {
  id: string;
  date: string; // YYYY-MM-DD (local)
  meal: Meal;
  foodId: string;
  /** Snapshot of the food at log time, so editing/deleting a custom food never rewrites history. */
  name: string;
  serving: string;
  servings: number;
  /** Set when the amount was entered by weight; `servings` is then grams / grams-per-serving. */
  grams?: number;
  /** Grams in one serving, snapshotted at log time (when known) */
  gramsPerServing?: number;
  /** Per-serving macros snapshot */
  per: Macros;
  createdAt: number;
}

export interface NutritionGoals extends Macros {
  /** kcal you can go over (goal + exercise) before the day turns red. Default 100. */
  overAllowance?: number;
}

export interface ExerciseGoals {
  /** Calories to burn through exercise per day */
  calories: number;
  /** Minutes of exercise per day */
  minutes: number;
  /** Workouts per week */
  workoutsPerWeek: number;
}

export interface WeightEntry {
  date: string;
  kg: number;
}

// ---------- Workouts ----------

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  custom?: boolean;
}

export interface WorkoutSet {
  id: string;
  kg: number | null;
  reps: number | null;
  done: boolean;
  /** Set when this set earned a PR at the moment it was completed */
  pr?: PrKind[];
}

export type PrKind = "weight" | "oneRm" | "volume" | "reps";

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  notes?: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  name: string;
  routineId?: string;
  date: string; // YYYY-MM-DD the workout was started on
  startedAt: number;
  endedAt: number;
  exercises: WorkoutExercise[];
  caloriesBurned: number;
  notes?: string;
}

export interface ActiveWorkout {
  id: string;
  name: string;
  routineId?: string;
  date: string;
  startedAt: number;
  exercises: WorkoutExercise[];
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  sets: number;
  /** Optional target, e.g. "8-12" */
  repRange?: string;
}

export interface Routine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  notes?: string;
  createdAt: number;
}

export interface WorkoutSettings {
  prSound: boolean;
  /** Seconds; 0 = off */
  restTimer: number;
  /** Fill kg/reps from the "previous" placeholder when ticking an empty set */
  autofillPrevious: boolean;
}
