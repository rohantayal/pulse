import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ActiveWorkout,
  Exercise,
  ExerciseGoals,
  Food,
  FoodLogEntry,
  Habit,
  HabitLog,
  Reminders,
  SavedMeal,
  SavedMealItem,
  Meal,
  MealDef,
  NutritionGoals,
  PrKind,
  Routine,
  WeightEntry,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutSettings,
} from "../types";
import { DEFAULT_MEALS } from "../types";
import { PRELOADED_FOODS } from "../data/foods";
import { PRELOADED_EXERCISES } from "../data/exercises";
import { ROUTINE_TEMPLATES } from "../data/routineTemplates";
import { todayKey } from "../lib/date";
import { uid } from "../lib/id";
import { bestsFromSets, detectPRs, exerciseBests, recomputePrs } from "../lib/workout";
import { gramsPerServing } from "../lib/foodText";
import type { Profile } from "../lib/plan";
import { toUnit, type WeightUnit } from "../lib/units";
import { appStorage } from "../lib/platform";

export interface AppState {
  selectedDate: string;

  profile: Profile | null;
  habits: Habit[];
  habitLog: HabitLog;
  savedMeals: SavedMeal[];
  saveMeal: (name: string, items: SavedMealItem[]) => SavedMeal;
  deleteSavedMeal: (id: string) => void;
  /** Log several foods at once (a saved meal, or yesterday's meal). Returns the new entry ids. */
  logItems: (date: string, meal: Meal, items: SavedMealItem[]) => string[];
  /** Log calories (and optionally macros) without picking a food. */
  quickAdd: (date: string, meal: Meal, q: { name?: string; calories: number; carbs?: number; protein?: number; fat?: number }) => void;
  /** Put back entries that were just deleted (Undo). */
  restoreFoodEntries: (entries: FoodLogEntry[]) => void;
  /** Put a deleted set back where it was (Undo). */
  restoreSet: (weId: string, set: WorkoutSet, index: number) => void;
  reminders: Reminders;
  setReminders: (r: Reminders) => void;

  /** Notes per exercise (by exercise id), shown under its name in every workout */
  exerciseNotes: Record<string, string>;
  setExerciseNote: (exerciseId: string, note: string) => void;
  addHabit: (h: Omit<Habit, "id" | "createdAt">) => Habit;
  updateHabit: (id: string, patch: Partial<Omit<Habit, "id" | "createdAt" | "auto">>) => void;
  deleteHabit: (id: string) => void;
  /** Set how many times a habit was done on a date (0 clears it). */
  setHabitCount: (date: string, id: string, count: number) => void;

  /** Display unit for weights. Everything is stored in kg. */
  unit: WeightUnit;
  setUnit: (u: WeightUnit) => void;
  onboarded: boolean;
  checklistDismissed: boolean;
  /** Save the profile and the (possibly edited) targets from onboarding, and log today's weight. */
  completeOnboarding: (profile: Profile, targets: { nutrition: NutritionGoals }) => void;
  dismissChecklist: () => void;
  updateProfile: (patch: Partial<Profile>) => void;

  lastBackupAt?: number;
  markBackedUp: () => void;
  /** Replace all data with a backup's contents. */
  restoreData: (data: Record<string, unknown>) => void;

  meals: MealDef[];
  customFoods: Food[];
  foodLog: FoodLogEntry[];
  recentFoodIds: string[];
  nutritionGoals: NutritionGoals;
  exerciseGoals: ExerciseGoals;
  weights: WeightEntry[];

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

  // exercise library
  saveCustomExercise: (e: Omit<Exercise, "id">) => Exercise;

  // routines
  saveRoutine: (r: Omit<Routine, "id" | "createdAt"> & { id?: string }) => Routine;
  deleteRoutine: (id: string) => void;
  /** Add starter routines by template key (see data/routineTemplates). */
  addTemplateRoutines: (keys: string[]) => void;

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

function mapActive(state: AppState, fn: (exs: WorkoutExercise[]) => WorkoutExercise[]): Partial<AppState> {
  if (!state.active) return {};
  return { active: { ...state.active, exercises: fn(state.active.exercises) } };
}

function mapSets(exs: WorkoutExercise[], weId: string, fn: (sets: WorkoutSet[]) => WorkoutSet[]): WorkoutExercise[] {
  return exs.map((e) => (e.id === weId ? { ...e, sets: fn(e.sets) } : e));
}

/** PRs for `set` given finished history plus the other completed sets of the same exercise in this workout. */
function prsFor(state: AppState, we: WorkoutExercise, set: WorkoutSet): PrKind[] {
  const history = exerciseBests(state.workouts, we.exerciseId);
  const others: WorkoutSet[] = [];
  for (const e of state.active?.exercises ?? []) {
    if (e.exerciseId !== we.exerciseId) continue;
    for (const s of e.sets) if (s.id !== set.id && s.done) others.push(s);
  }
  // Earlier sets this workout raise the bar, but only an earlier *workout* makes a PR possible.
  return detectPRs(set, bestsFromSets(others, history), history.any);
}

function defaultName(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning Workout";
  if (h < 17) return "Afternoon Workout";
  return "Evening Workout";
}

/** Values used for anything a backup file doesn't include. */
const RESTORE_DEFAULTS = {
  profile: null,
  onboarded: true,
  checklistDismissed: true,
  customFoods: [],
  foodLog: [],
  recentFoodIds: [],
  weights: [],
  customExercises: [],
  workouts: [],
  habits: [],
  habitLog: {},
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      selectedDate: todayKey(),

      profile: null,
      habits: [],
      habitLog: {},
      exerciseNotes: {},
      savedMeals: [],
      saveMeal: (name, items) => {
        const m: SavedMeal = { id: uid(), name: name.trim(), items, createdAt: Date.now() };
        set((s) => ({ savedMeals: [m, ...s.savedMeals] }));
        return m;
      },
      deleteSavedMeal: (id) => set((s) => ({ savedMeals: s.savedMeals.filter((m) => m.id !== id) })),
      logItems: (date, meal, items) => {
        const now = Date.now();
        const entries: FoodLogEntry[] = items.map((it, i) => ({ ...it, id: uid(), date, meal, createdAt: now + i }));
        set((s) => ({ foodLog: [...s.foodLog, ...entries] }));
        return entries.map((e) => e.id);
      },
      quickAdd: (date, meal, q) =>
        set((s) => ({
          foodLog: [
            ...s.foodLog,
            {
              id: uid(),
              date,
              meal,
              foodId: "quick",
              name: q.name?.trim() || "Quick add",
              serving: "quick add",
              servings: 1,
              per: { calories: q.calories, carbs: q.carbs ?? 0, protein: q.protein ?? 0, fat: q.fat ?? 0 },
              createdAt: Date.now(),
            },
          ],
        })),
      restoreFoodEntries: (entries) =>
        set((s) => {
          const have = new Set(s.foodLog.map((e) => e.id));
          return { foodLog: [...s.foodLog, ...entries.filter((e) => !have.has(e.id))] };
        }),
      restoreSet: (weId, st, index) =>
        set((s) =>
          mapActive(s, (exs) =>
            mapSets(exs, weId, (sets) => (sets.some((x) => x.id === st.id) ? sets : [...sets.slice(0, index), st, ...sets.slice(index)])),
          ),
        ),
      reminders: {
        meals: { breakfast: { on: false, time: "10:00" }, lunch: { on: false, time: "14:30" }, dinner: { on: false, time: "21:30" } },
        habits: { on: false, time: "20:30" },
      },
      setReminders: (reminders) => set({ reminders }),
      setExerciseNote: (exerciseId, note) =>
        set((s) => {
          const exerciseNotes = { ...s.exerciseNotes };
          if (note.trim()) exerciseNotes[exerciseId] = note.trim();
          else delete exerciseNotes[exerciseId];
          return { exerciseNotes };
        }),
      addHabit: (input) => {
        const h: Habit = { ...input, name: input.name.trim(), id: uid(), createdAt: Date.now() };
        set((s) => ({ habits: [...s.habits, h] }));
        return h;
      },
      updateHabit: (id, patch) => set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) })),
      deleteHabit: (id) =>
        set((s) => {
          const habitLog: HabitLog = {};
          for (const [date, row] of Object.entries(s.habitLog)) {
            const { [id]: _gone, ...rest } = row;
            void _gone;
            if (Object.keys(rest).length) habitLog[date] = rest;
          }
          return { habits: s.habits.filter((h) => h.id !== id), habitLog };
        }),
      setHabitCount: (date, id, count) =>
        set((s) => {
          const row = { ...(s.habitLog[date] ?? {}) };
          if (count > 0) row[id] = count;
          else delete row[id];
          const habitLog = { ...s.habitLog, [date]: row };
          if (!Object.keys(row).length) delete habitLog[date];
          return { habitLog };
        }),
      unit: "kg",
      setUnit: (unit) => set({ unit }),
      onboarded: false,
      checklistDismissed: false,
      completeOnboarding: (profile, { nutrition }) =>
        set((s) => {
          const today = todayKey();
          return {
            profile,
            onboarded: true,
            checklistDismissed: false,
            nutritionGoals: { ...s.nutritionGoals, ...nutrition },
            exerciseGoals: { ...s.exerciseGoals, workoutsPerWeek: profile.workoutsPerWeek },
            weights: [...s.weights.filter((w) => w.date !== today), { date: today, kg: profile.weightKg }].sort((a, b) => a.date.localeCompare(b.date)),
          };
        }),
      dismissChecklist: () => set({ checklistDismissed: true }),
      lastBackupAt: undefined,
      markBackedUp: () => set({ lastBackupAt: Date.now() }),
      restoreData: (data) => set({ ...RESTORE_DEFAULTS, ...data, active: (data.active as ActiveWorkout | null | undefined) ?? null, selectedDate: todayKey() }),
      updateProfile: (patch) => set((s) => (s.profile ? { profile: { ...s.profile, ...patch } } : {})),

      meals: DEFAULT_MEALS,
      customFoods: [],
      foodLog: [],
      recentFoodIds: [],
      nutritionGoals: { calories: 2200, carbs: 250, protein: 140, fat: 70 },
      exerciseGoals: { calories: 400, minutes: 45, workoutsPerWeek: 4 },
      weights: [],
    
      customExercises: [],
      routines: [],
      workouts: [],
      active: null,
      settings: { prSound: true, autofillPrevious: true },

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
      addTemplateRoutines: (keys) =>
        set((s) => ({
          routines: [
            ...s.routines,
            ...ROUTINE_TEMPLATES.filter((t) => keys.includes(t.key)).map((t) => ({
              id: uid(),
              name: t.name,
              createdAt: Date.now(),
              exercises: t.exercises.map(([id, sets, repRange]) => ({ id: uid(), exerciseId: `pre:${id}`, sets, repRange })),
            })),
          ],
        })),
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
      storage: createJSONStorage(() => appStorage),
      // The selected day is per-session; always open on today.
      partialize: (s) => {
        // Step counting was removed: drop any old step data still sitting in saved state.
        const { selectedDate: _ignored, steps: _s, healthSteps: _h, ...rest } = s as AppState & { steps?: unknown; healthSteps?: unknown };
        void _ignored;
        void _s;
        void _h;
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

/** True once saved data has been loaded (instant in the browser, async in the Android app). */
export function useHydrated(): boolean {
  const [done, setDone] = useState(() => useApp.persist.hasHydrated());
  useEffect(() => {
    if (done) return;
    const unsub = useApp.persist.onFinishHydration(() => setDone(true));
    if (useApp.persist.hasHydrated()) setDone(true);
    return unsub;
  }, [done]);
  return done;
}
