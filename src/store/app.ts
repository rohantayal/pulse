import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ActiveWorkout,
  Exercise,
  ExerciseGoals,
  Food,
  FoodLogEntry,
  Meal,
  MealDef,
  NutritionGoals,
  PrKind,
  Routine,
  StepEntry,
  WeightEntry,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutSettings,
} from "../types";
import { DEFAULT_MEALS } from "../types";
import { PRELOADED_FOODS } from "../data/foods";
import { PRELOADED_EXERCISES } from "../data/exercises";
import { todayKey } from "../lib/date";
import { uid } from "../lib/id";
import { bestsFromSets, detectPRs, exerciseBests, recomputePrs } from "../lib/workout";
import { gramsPerServing } from "../lib/foodText";
import type { Profile } from "../lib/plan";
import { toUnit, type WeightUnit } from "../lib/units";

export interface AppState {
  selectedDate: string;

  profile: Profile | null;
  /** Display unit for weights. Everything is stored in kg. */
  unit: WeightUnit;
  setUnit: (u: WeightUnit) => void;
  onboarded: boolean;
  checklistDismissed: boolean;
  /** Save the profile and the (possibly edited) targets from onboarding, and log today's weight. */
  completeOnboarding: (profile: Profile, targets: { nutrition: NutritionGoals; steps: number }) => void;
  dismissChecklist: () => void;
  updateProfile: (patch: Partial<Profile>) => void;

  meals: MealDef[];
  customFoods: Food[];
  foodLog: FoodLogEntry[];
  recentFoodIds: string[];
  nutritionGoals: NutritionGoals;
  exerciseGoals: ExerciseGoals;
  weights: WeightEntry[];
  steps: StepEntry[];

  customExercises: Exercise[];
  routines: Routine[];
  workouts: Workout[];
  active: ActiveWorkout | null;
  settings: WorkoutSettings;

  // navigation-ish
  setDate: (date: string) => void;

  // nutrition
  /** Log a food. Pass `grams` when the amount was entered by weight (servings is derived). */
  addFoodEntry: (date: string, meal: Meal, food: Food, amount: { servings: number; grams?: number }) => void;
  updateFoodEntry: (id: string, patch: Partial<Pick<FoodLogEntry, "servings" | "meal" | "grams">>) => void;
  addMeal: (label: string) => MealDef;
  renameMeal: (id: Meal, label: string) => void;
  /** Removes a meal section; any foods logged under it move to Snacks. */
  deleteMeal: (id: Meal) => void;
  removeFoodEntry: (id: string) => void;
  saveCustomFood: (food: Omit<Food, "id"> & { id?: string }) => Food;
  deleteCustomFood: (id: string) => void;
  setNutritionGoals: (g: NutritionGoals) => void;
  setExerciseGoals: (g: ExerciseGoals) => void;
  setWeight: (date: string, kg: number | null) => void;
  setSteps: (date: string, steps: number | null) => void;

  // exercise library
  saveCustomExercise: (e: Omit<Exercise, "id">) => Exercise;

  // routines
  saveRoutine: (r: Omit<Routine, "id" | "createdAt"> & { id?: string }) => Routine;
  deleteRoutine: (id: string) => void;

  // active workout
  startWorkout: (routine?: Routine) => void;
  renameActive: (name: string) => void;
  addExercises: (exerciseIds: string[]) => void;
  removeExercise: (weId: string) => void;
  moveExercise: (weId: string, dir: -1 | 1) => void;
  replaceExercise: (weId: string, exerciseId: string) => void;
  addSet: (weId: string) => void;
  removeSet: (weId: string, setId: string) => void;
  updateSet: (weId: string, setId: string, patch: Partial<Pick<WorkoutSet, "kg" | "reps">>) => void;
  /** Toggle a set's done state. Returns the PRs newly earned (empty when un-ticking or none). */
  toggleSet: (weId: string, setId: string, fill?: { kg: number | null; reps: number | null }) => PrKind[];
  finishWorkout: (opts: { name: string; caloriesBurned: number; notes?: string }) => Workout | null;
  discardWorkout: () => void;
  deleteWorkout: (id: string) => void;
  /** Replace a finished workout (edited) and re-derive PRs across history. */
  updateWorkout: (w: Workout) => void;
  saveWorkoutAsRoutine: (workoutId: string) => Routine | null;

  setSettings: (s: Partial<WorkoutSettings>) => void;
}

export function allFoods(custom: Food[]): Food[] {
  return [...custom, ...PRELOADED_FOODS];
}

export function allExercises(custom: Exercise[]): Exercise[] {
  return [...custom, ...PRELOADED_EXERCISES];
}

function emptySet(): WorkoutSet {
  return { id: uid(), kg: null, reps: null, done: false };
}

function seedRoutines(): Routine[] {
  const mk = (name: string, ids: [string, number, string][]): Routine => ({
    id: uid(),
    name,
    createdAt: Date.now(),
    exercises: ids.map(([exerciseId, sets, repRange]) => ({ id: uid(), exerciseId: `pre:${exerciseId}`, sets, repRange })),
  });
  return [
    mk("Push", [
      ["bench-press-bb", 4, "6-8"],
      ["incline-bench-db", 3, "8-10"],
      ["shoulder-press-db", 3, "8-10"],
      ["lateral-raise-db", 3, "12-15"],
      ["tricep-pushdown", 3, "10-12"],
    ]),
    mk("Pull", [
      ["deadlift-bb", 3, "5"],
      ["pull-up", 3, "6-10"],
      ["seated-cable-row", 3, "8-12"],
      ["face-pull", 3, "12-15"],
      ["bicep-curl-db", 3, "10-12"],
    ]),
    mk("Legs", [
      ["squat-bb", 4, "6-8"],
      ["rdl-bb", 3, "8-10"],
      ["leg-press", 3, "10-12"],
      ["leg-curl-seated", 3, "10-12"],
      ["calf-raise-standing", 4, "12-15"],
    ]),
  ];
}

function mapActive(state: AppState, fn: (exs: WorkoutExercise[]) => WorkoutExercise[]): Partial<AppState> {
  if (!state.active) return {};
  return { active: { ...state.active, exercises: fn(state.active.exercises) } };
}

function mapSets(exs: WorkoutExercise[], weId: string, fn: (sets: WorkoutSet[]) => WorkoutSet[]): WorkoutExercise[] {
  return exs.map((e) => (e.id === weId ? { ...e, sets: fn(e.sets) } : e));
}

/** PRs for `set` given finished history plus the other completed sets of the same exercise in this workout. */
function prsFor(state: AppState, we: WorkoutExercise, set: WorkoutSet): PrKind[] {
  let bests = exerciseBests(state.workouts, we.exerciseId);
  const others: WorkoutSet[] = [];
  for (const e of state.active?.exercises ?? []) {
    if (e.exerciseId !== we.exerciseId) continue;
    for (const s of e.sets) if (s.id !== set.id && s.done) others.push(s);
  }
  bests = bestsFromSets(others, bests);
  return detectPRs(set, bests);
}

function defaultName(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning Workout";
  if (h < 17) return "Afternoon Workout";
  return "Evening Workout";
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      selectedDate: todayKey(),

      profile: null,
      unit: "kg",
      setUnit: (unit) => set({ unit }),
      onboarded: false,
      checklistDismissed: false,
      completeOnboarding: (profile, { nutrition, steps }) =>
        set((s) => {
          const today = todayKey();
          return {
            profile,
            onboarded: true,
            checklistDismissed: false,
            nutritionGoals: { ...s.nutritionGoals, ...nutrition },
            exerciseGoals: { ...s.exerciseGoals, steps, workoutsPerWeek: profile.workoutsPerWeek },
            weights: [...s.weights.filter((w) => w.date !== today), { date: today, kg: profile.weightKg }].sort((a, b) => a.date.localeCompare(b.date)),
          };
        }),
      dismissChecklist: () => set({ checklistDismissed: true }),
      updateProfile: (patch) => set((s) => (s.profile ? { profile: { ...s.profile, ...patch } } : {})),

      meals: DEFAULT_MEALS,
      customFoods: [],
      foodLog: [],
      recentFoodIds: [],
      nutritionGoals: { calories: 2200, carbs: 250, protein: 140, fat: 70 },
      exerciseGoals: { calories: 400, minutes: 45, steps: 10000, workoutsPerWeek: 4 },
      weights: [],
      steps: [],

      customExercises: [],
      routines: seedRoutines(),
      workouts: [],
      active: null,
      settings: { prSound: true, restTimer: 90, autofillPrevious: true },

      setDate: (date) => set({ selectedDate: date }),

      addFoodEntry: (date, meal, food, { servings, grams }) =>
        set((s) => ({
          foodLog: [
            ...s.foodLog,
            {
              id: uid(),
              date,
              meal,
              foodId: food.id,
              name: food.brand ? `${food.name} (${food.brand})` : food.name,
              serving: food.serving,
              servings,
              grams,
              gramsPerServing: gramsPerServing(food),
              per: { calories: food.calories, carbs: food.carbs, protein: food.protein, fat: food.fat },
              createdAt: Date.now(),
            },
          ],
          recentFoodIds: [food.id, ...s.recentFoodIds.filter((id) => id !== food.id)].slice(0, 30),
        })),
      updateFoodEntry: (id, patch) =>
        set((s) => ({ foodLog: s.foodLog.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      addMeal: (label) => {
        const meal: MealDef = { id: `meal:${uid()}`, label: label.trim() };
        set((s) => ({ meals: [...s.meals, meal] }));
        return meal;
      },
      renameMeal: (id, label) => set((s) => ({ meals: s.meals.map((m) => (m.id === id ? { ...m, label: label.trim() } : m)) })),
      deleteMeal: (id) =>
        set((s) => (!isCustomMeal(id) ? {} : {
          meals: s.meals.filter((m) => m.id !== id),
          foodLog: s.foodLog.map((e) => (e.meal === id ? { ...e, meal: "snacks" } : e)),
        })),
      removeFoodEntry: (id) => set((s) => ({ foodLog: s.foodLog.filter((e) => e.id !== id) })),

      saveCustomFood: (input) => {
        const food: Food = { ...input, id: input.id ?? `custom:${uid()}`, custom: true };
        set((s) => {
          const exists = s.customFoods.some((f) => f.id === food.id);
          return {
            customFoods: exists ? s.customFoods.map((f) => (f.id === food.id ? food : f)) : [food, ...s.customFoods],
          };
        });
        return food;
      },
      deleteCustomFood: (id) =>
        set((s) => ({
          customFoods: s.customFoods.filter((f) => f.id !== id),
          recentFoodIds: s.recentFoodIds.filter((r) => r !== id),
        })),

      setNutritionGoals: (g) => set({ nutritionGoals: g }),
      setExerciseGoals: (g) => set({ exerciseGoals: g }),

      setWeight: (date, kg) =>
        set((s) => {
          const rest = s.weights.filter((w) => w.date !== date);
          return { weights: kg == null ? rest : [...rest, { date, kg }].sort((a, b) => a.date.localeCompare(b.date)) };
        }),
      setSteps: (date, steps) =>
        set((s) => {
          const rest = s.steps.filter((w) => w.date !== date);
          return { steps: steps == null ? rest : [...rest, { date, steps }].sort((a, b) => a.date.localeCompare(b.date)) };
        }),

      saveCustomExercise: (input) => {
        const ex: Exercise = { ...input, id: `custom:${uid()}`, custom: true };
        set((s) => ({ customExercises: [ex, ...s.customExercises] }));
        return ex;
      },

      saveRoutine: (input) => {
        const existing = input.id ? get().routines.find((r) => r.id === input.id) : undefined;
        const routine: Routine = {
          ...input,
          id: existing?.id ?? uid(),
          createdAt: existing?.createdAt ?? Date.now(),
        };
        set((s) => ({
          routines: existing ? s.routines.map((r) => (r.id === routine.id ? routine : r)) : [...s.routines, routine],
        }));
        return routine;
      },
      deleteRoutine: (id) => set((s) => ({ routines: s.routines.filter((r) => r.id !== id) })),

      startWorkout: (routine) =>
        set({
          active: {
            id: uid(),
            name: routine?.name ?? defaultName(),
            routineId: routine?.id,
            date: todayKey(),
            startedAt: Date.now(),
            exercises: (routine?.exercises ?? []).map((re) => ({
              id: uid(),
              exerciseId: re.exerciseId,
              sets: Array.from({ length: Math.max(1, re.sets) }, emptySet),
            })),
          },
        }),
      renameActive: (name) => set((s) => (s.active ? { active: { ...s.active, name } } : {})),

      addExercises: (ids) =>
        set((s) => mapActive(s, (exs) => [...exs, ...ids.map((exerciseId) => ({ id: uid(), exerciseId, sets: [emptySet()] }))])),
      removeExercise: (weId) => set((s) => mapActive(s, (exs) => exs.filter((e) => e.id !== weId))),
      moveExercise: (weId, dir) =>
        set((s) =>
          mapActive(s, (exs) => {
            const i = exs.findIndex((e) => e.id === weId);
            const j = i + dir;
            if (i < 0 || j < 0 || j >= exs.length) return exs;
            const copy = [...exs];
            [copy[i], copy[j]] = [copy[j], copy[i]];
            return copy;
          }),
        ),
      replaceExercise: (weId, exerciseId) =>
        set((s) =>
          mapActive(s, (exs) =>
            exs.map((e) => (e.id === weId ? { ...e, exerciseId, sets: e.sets.map((x) => ({ ...x, done: false, pr: undefined })) } : e)),
          ),
        ),

      addSet: (weId) =>
        set((s) =>
          mapActive(s, (exs) =>
            mapSets(exs, weId, (sets) => {
              const last = sets[sets.length - 1];
              // Like Hevy: a new set starts with the previous set's numbers pre-filled.
              return [...sets, { ...emptySet(), kg: last?.kg ?? null, reps: last?.reps ?? null }];
            }),
          ),
        ),
      removeSet: (weId, setId) => set((s) => mapActive(s, (exs) => mapSets(exs, weId, (sets) => sets.filter((x) => x.id !== setId)))),

      updateSet: (weId, setId, patch) =>
        set((s) => {
          const we = s.active?.exercises.find((e) => e.id === weId);
          return mapActive(s, (exs) =>
            mapSets(exs, weId, (sets) =>
              sets.map((x) => {
                if (x.id !== setId) return x;
                const next = { ...x, ...patch };
                // A completed set that gets edited keeps its PR badge honest.
                if (next.done && we) next.pr = prsFor(s, we, next);
                return next;
              }),
            ),
          );
        }),

      toggleSet: (weId, setId, fill) => {
        const s = get();
        const we = s.active?.exercises.find((e) => e.id === weId);
        const cur = we?.sets.find((x) => x.id === setId);
        if (!we || !cur) return [];
        if (cur.done) {
          set((st) => mapActive(st, (exs) => mapSets(exs, weId, (sets) => sets.map((x) => (x.id === setId ? { ...x, done: false, pr: undefined } : x)))));
          return [];
        }
        const next: WorkoutSet = {
          ...cur,
          kg: cur.kg ?? fill?.kg ?? null,
          reps: cur.reps ?? fill?.reps ?? null,
          done: true,
        };
        if (next.reps == null || next.reps <= 0) return [];
        next.pr = prsFor(s, we, next);
        set((st) => mapActive(st, (exs) => mapSets(exs, weId, (sets) => sets.map((x) => (x.id === setId ? next : x)))));
        return next.pr;
      },

      finishWorkout: ({ name, caloriesBurned, notes }) => {
        const a = get().active;
        if (!a) return null;
        const exercises = a.exercises
          .map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) }))
          .filter((e) => e.sets.length > 0);
        if (exercises.length === 0) return null;
        const workout: Workout = {
          id: a.id,
          name: name.trim() || a.name,
          routineId: a.routineId,
          date: a.date,
          startedAt: a.startedAt,
          endedAt: Date.now(),
          exercises,
          caloriesBurned: Math.max(0, Math.round(caloriesBurned)),
          notes: notes?.trim() || undefined,
        };
        set((s) => ({ workouts: [workout, ...s.workouts], active: null }));
        return workout;
      },
      discardWorkout: () => set({ active: null }),
      deleteWorkout: (id) => set((s) => ({ workouts: recomputePrs(s.workouts.filter((w) => w.id !== id)) })),
      updateWorkout: (w) => set((s) => ({ workouts: recomputePrs(s.workouts.map((x) => (x.id === w.id ? w : x))) })),

      saveWorkoutAsRoutine: (workoutId) => {
        const w = get().workouts.find((x) => x.id === workoutId);
        if (!w) return null;
        return get().saveRoutine({
          name: w.name,
          exercises: w.exercises.map((e) => ({ id: uid(), exerciseId: e.exerciseId, sets: e.sets.length })),
        });
      },

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: "pulse-app-v1",
      storage: createJSONStorage(() => localStorage),
      // The selected day is per-session; always open on today.
      partialize: (s) => {
        const { selectedDate: _ignored, ...rest } = s;
        void _ignored;
        return rest;
      },
    },
  ),
);

/** Only meals the user added can be deleted; the four defaults can just be renamed. */
export function isCustomMeal(id: string): boolean {
  return id.startsWith("meal:");
}

/** Current weight unit plus converters bound to it. */
export function useUnit() {
  const unit = useApp((s) => s.unit);
  return {
    unit,
    /** kg → display number */
    show: (kg: number) => toUnit(kg, unit),
  };
}
