import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Dumbbell, Footprints, Menu, MoreHorizontal, Pencil, Plus, Scale, Share2, Trash2 } from "lucide-react";
import clsx from "clsx";
import { isCustomMeal, useApp } from "../store/app";
import { useUi } from "../store/ui";
import type { FoodLogEntry, MealDef, NutritionGoals } from "../types";
import { addDays, dayNum, dowShort, friendlyDate, longDate, todayKey, weekDays, formatDuration } from "../lib/date";
import { useSwipe } from "../lib/useSwipe";
import { dayStats } from "../lib/day";
import { BAR_COLOR, amountLabel, calorieStatus, entryMacros, statusColor, sumEntries, type CalorieStatus } from "../lib/nutrition";
import { fmt } from "../lib/format";
import { completedSets, exercisesVolume } from "../lib/workout";
import { Button, Card, Confirm, NumberInput, ProgressBar, Sheet, SectionTitle, inputCls } from "../components/ui";
import { MonthCalendar } from "../components/MonthCalendar";
import { FoodEntrySheet } from "./LogFood";
import { AddMealSheet } from "../components/AddMealSheet";
import { MealSummary } from "../components/MealSummary";
import { GettingStarted } from "../components/GettingStarted";

export function Home() {
  const date = useApp((s) => s.selectedDate);
  const setDate = useApp((s) => s.setDate);
  const foodLog = useApp((s) => s.foodLog);
  const workouts = useApp((s) => s.workouts);
  const steps = useApp((s) => s.steps);
  const weights = useApp((s) => s.weights);
  const goals = useApp((s) => s.nutritionGoals);
  const exGoals = useApp((s) => s.exerciseGoals);
  const meals = useApp((s) => s.meals);
  const { setMenu, push, showToast } = useUi();

  const [calOpen, setCalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<FoodLogEntry | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [addingMeal, setAddingMeal] = useState(false);
  const [mealMenu, setMealMenu] = useState<MealDef | null>(null);
  const [slide, setSlide] = useState<"l" | "r" | null>(null);

  const stats = useMemo(() => dayStats(date, { foodLog, workouts, steps, weights }), [date, foodLog, workouts, steps, weights]);
  const dayEntries = useMemo(() => foodLog.filter((e) => e.date === date), [foodLog, date]);
  const weight = weights.find((w) => w.date === date)?.kg;

  const go = (n: number) => {
    setSlide(n > 0 ? "l" : "r");
    setDate(addDays(date, n));
  };
  const daySwipe = useSwipe(() => go(1), () => go(-1));
  const weekSwipe = useSwipe(() => go(7), () => go(-7));

  // Per-day calorie status for the dots under the week strip
  const weekStatus = useMemo(() => {
    const m = new Map<string, CalorieStatus>();
    for (const k of weekDays(date)) {
      const st = dayStats(k, { foodLog, workouts, steps, weights });
      if (st.food.calories > 0) m.set(k, calorieStatus(st.food.calories, goals.calories + st.exercise, goals.overAllowance));
    }
    return m;
  }, [date, foodLog, workouts, steps, weights, goals]);

  const marked = useMemo(() => new Set([...foodLog.map((e) => e.date), ...workouts.map((w) => w.date)]), [foodLog, workouts]);

  const remaining = goals.calories - stats.food.calories + stats.exercise;

  async function share() {
    const lines = [
      `${longDate(date)}`,
      `Calories: ${fmt(stats.food.calories)} eaten · ${fmt(stats.exercise)} burned · ${fmt(remaining)} remaining (goal ${fmt(goals.calories)})`,
      `Carbs ${fmt(stats.food.carbs)}/${goals.carbs} g · Protein ${fmt(stats.food.protein)}/${goals.protein} g · Fat ${fmt(stats.food.fat)}/${goals.fat} g`,
      stats.steps ? `Steps: ${fmt(stats.steps)}` : "",
      ...stats.workouts.map(
        (w) => `🏋️ ${w.name} – ${formatDuration(w.endedAt - w.startedAt)}, ${fmt(exercisesVolume(w.exercises))} kg volume, ${completedSets(w.exercises)} sets`,
      ),
    ].filter(Boolean);
    const text = lines.join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: "My day", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      showToast("Day summary copied");
    } catch {
      /* user cancelled share */
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Top bar: menu | date | share */}
      <header className="pt-safe sticky top-0 z-20 bg-bg/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-2">
          <button onClick={() => setMenu(true)} className="flex h-10 w-10 items-center justify-center rounded-full active:bg-surf2" aria-label="Menu">
            <Menu size={22} />
          </button>
          <button onClick={() => setCalOpen(true)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold active:bg-surf2">
            <CalendarDays size={16} className="text-tx2" />
            {friendlyDate(date)}
          </button>
          <button onClick={share} className="flex h-10 w-10 items-center justify-center rounded-full active:bg-surf2" aria-label="Share">
            <Share2 size={20} />
          </button>
        </div>

        {/* Week strip — one small card per day: green when the day's calories are within goal, red when over */}
        <div {...weekSwipe} className="grid select-none grid-cols-7 gap-1.5 px-3 pb-3">
          {weekDays(date).map((k) => {
            const sel = k === date;
            const isToday = k === todayKey();
            const st = weekStatus.get(k);
            const future = k > todayKey();
            return (
              <button
                key={k}
                onClick={() => {
                  setSlide(k > date ? "l" : "r");
                  setDate(k);
                }}
                aria-label={`${longDate(k)}${st === "good" ? ", within goal" : st === "over" ? ", over goal" : ""}`}
                aria-pressed={sel}
                className={clsx(
                  "flex flex-col items-center rounded-xl py-1.5 transition active:scale-95",
                  sel ? "border-2" : "border",
                  st === "good" && (sel ? "border-good bg-good/25" : "border-good/50 bg-good/10"),
                  st === "over" && (sel ? "border-bad bg-bad/25" : "border-bad/50 bg-bad/10"),
                  !st && (sel ? "border-tx2 bg-surf2" : "border-line bg-surf"),
                  future && !sel && "opacity-50",
                )}
              >
                <span className={clsx("text-[11px] font-medium", st === "good" ? "text-good" : st === "over" ? "text-bad" : isToday ? "text-acc" : "text-tx2")}>
                  {dowShort(k)}
                </span>
                <span className={clsx("text-[17px] font-semibold leading-tight", st === "good" ? "text-good" : st === "over" ? "text-bad" : isToday ? "text-acc" : "text-tx")}>
                  {dayNum(k)}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Day content — swipe to change day */}
      <div {...daySwipe} key={date} className={clsx("flex-1 px-3 pb-36", slide && "animate-fade-in")}>
        {date === todayKey() && <GettingStarted />}
        <Card>
          <CalorieSection goal={goals.calories} food={stats.food.calories} exercise={stats.exercise} allowance={goals.overAllowance} />
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-line pt-4">
            <Macro label="Carbs" now={stats.food.carbs} goal={goals.carbs} />
            <Macro label="Protein" now={stats.food.protein} goal={goals.protein} />
            <Macro label="Fat" now={stats.food.fat} goal={goals.fat} />
          </div>
        </Card>

        {/* Meals */}
        {meals.map((m) => (
          <MealBlock
            key={m.id}
            meal={m}
            entries={dayEntries.filter((e) => e.meal === m.id)}
            goals={goals}
            onAdd={() => push({ kind: "logFood", meal: m.id, date })}
            onEdit={setEditEntry}
            onMenu={() => setMealMenu(m)}
          />
        ))}
        <button
          onClick={() => setAddingMeal(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line py-3 text-sm font-semibold text-tx2 active:bg-surf"
        >
          <Plus size={16} /> Add meal
        </button>

        {/* Exercise */}
        <SectionTitle>Exercise</SectionTitle>
        <Card className="divide-y divide-line p-0">
          {stats.workouts.map((w) => (
            <button key={w.id} onClick={() => push({ kind: "workoutDetail", workoutId: w.id })} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surf2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-acc/15 text-acc">
                <Dumbbell size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{w.name}</div>
                <div className="text-xs text-tx2">
                  {formatDuration(w.endedAt - w.startedAt)} · {fmt(exercisesVolume(w.exercises))} kg · {completedSets(w.exercises)} set{completedSets(w.exercises) === 1 ? "" : "s"}
                </div>
              </div>
              <div className="text-sm font-semibold">{w.caloriesBurned} kcal</div>
            </button>
          ))}
          <button onClick={() => setStepsOpen(true)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surf2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-good/15 text-good">
              <Footprints size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">Steps</div>
              <ProgressBar value={stats.steps} max={exGoals.steps} color="#3fb96b" className="mt-1.5" />
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">{fmt(stats.steps)}</div>
              <div className="text-[11px] text-tx3">/ {fmt(exGoals.steps)}</div>
            </div>
          </button>
        </Card>
        <button
          onClick={() => useUi.getState().setAdd(true)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-acc active:bg-surf"
        >
          <Plus size={16} /> Add workout
        </button>

        {/* Body */}
        <SectionTitle>Body</SectionTitle>
        <Card onClick={() => setWeightOpen(true)} className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surf3 text-tx">
            <Scale size={18} />
          </div>
          <div className="flex-1 font-medium">Weight</div>
          <div className="text-sm font-semibold">{weight != null ? `${fmt(weight, 1)} kg` : <span className="text-acc">Log</span>}</div>
          <ChevronRight size={18} className="text-tx3" />
        </Card>
      </div>

      <Sheet open={calOpen} onClose={() => setCalOpen(false)} title="Go to date">
        <MonthCalendar
          value={date}
          marked={marked}
          onChange={(k) => {
            setDate(k);
            setCalOpen(false);
          }}
        />
        <Button
          variant="secondary"
          className="mt-4 w-full"
          onClick={() => {
            setDate(todayKey());
            setCalOpen(false);
          }}
        >
          Jump to today
        </Button>
      </Sheet>

      <AddMealSheet open={addingMeal} onClose={() => setAddingMeal(false)} />
      {mealMenu && <MealMenuSheet meal={mealMenu} onClose={() => setMealMenu(null)} />}
      {editEntry && <FoodEntrySheet entry={editEntry} onClose={() => setEditEntry(null)} />}
      <QuickNumberSheet
        open={stepsOpen}
        title="Steps"
        initial={stats.steps || null}
        suffix="steps"
        step="1"
        onClose={() => setStepsOpen(false)}
        onSave={(v) => useApp.getState().setSteps(date, v && v > 0 ? Math.round(v) : null)}
      />
      <QuickNumberSheet
        open={weightOpen}
        title="Body weight"
        initial={weight ?? null}
        suffix="kg"
        onClose={() => setWeightOpen(false)}
        onSave={(v) => useApp.getState().setWeight(date, v && v > 0 ? v : null)}
      />
    </div>
  );
}

function CalorieSection({ goal, food, exercise, allowance }: { goal: number; food: number; exercise: number; allowance?: number }) {
  const remaining = goal - food + exercise;
  const budget = goal + exercise;
  const status = calorieStatus(food, budget, allowance);
  const color = statusColor(status);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="text-[15px] font-semibold">Calories</div>
        <div className="text-xs text-tx2">Goal {fmt(goal)} kcal</div>
      </div>
      <div className="mt-3 grid grid-cols-3 items-end divide-x divide-line text-center">
        <Stat label="Food" value={food} />
        <Stat label="Exercise" value={exercise} />
        <div>
          <div className="text-[28px] font-bold leading-none tabular-nums" style={{ color }}>
            {fmt(Math.abs(remaining))}
          </div>
          <div className="mt-1 text-xs text-tx2">{remaining < 0 ? "Over" : "Remaining"}</div>
        </div>
      </div>
      <ProgressBar value={food} max={budget} color={color} className="mt-4" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[22px] font-semibold leading-none tabular-nums">{fmt(value)}</div>
      <div className="mt-1 text-xs text-tx2">{label}</div>
    </div>
  );
}

function Macro({ label, now, goal }: { label: string; now: number; goal: number }) {
  const left = goal - now;
  return (
    <div>
      <div className="text-xs font-medium text-tx2">{label}</div>
      <div className="mt-1 text-[15px] font-semibold tabular-nums">
        {fmt(now)}
        <span className="font-normal text-tx2">/{fmt(goal)} g</span>
      </div>
      <ProgressBar value={now} max={goal} color={BAR_COLOR} className="mt-1.5 h-1" />
      <div className="mt-1 text-[11px] text-tx3">{left >= 0 ? `${fmt(left)} g left` : `${fmt(-left)} g over`}</div>
    </div>
  );
}

function MealBlock({
  meal,
  entries,
  onAdd,
  onEdit,
  onMenu,
  goals,
}: {
  meal: MealDef;
  entries: FoodLogEntry[];
  goals: NutritionGoals;
  onAdd: () => void;
  onEdit: (e: FoodLogEntry) => void;
  onMenu: () => void;
}) {
  const total = sumEntries(entries);
  return (
    <div data-meal={meal.id}>
      <SectionTitle
        right={
          <span className="flex items-center gap-1">
            <span className="text-xs font-semibold text-tx2">{fmt(total.calories)} kcal</span>
            <button onClick={onMenu} className="-mr-1 rounded-full p-1 text-tx3 active:bg-surf2" aria-label={`${meal.label} options`}>
              <MoreHorizontal size={16} />
            </button>
          </span>
        }
      >
        {meal.label}
      </SectionTitle>
      <Card className="p-0">
        {entries.map((e) => {
          const m = entryMacros(e);
          return (
            <button key={e.id} onClick={() => onEdit(e)} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left active:bg-surf2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{e.name}</div>
                <div className="truncate text-xs text-tx2">
                  {amountLabel(e)} · C {fmt(m.carbs)} · P {fmt(m.protein)} · F {fmt(m.fat)}
                </div>
              </div>
              <div className="text-sm font-semibold tabular-nums">{fmt(m.calories)}</div>
            </button>
          );
        })}
        {entries.length > 0 && (
          <MealSummary
            mealId={meal.id}
            label={meal.label}
            meal={total}
            goals={goals}
            className="border-b border-line px-4 py-4"
          />
        )}
        <button onClick={onAdd} className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-acc active:bg-surf2">
          <Plus size={16} /> Add food
        </button>
      </Card>
    </div>
  );
}

function MealMenuSheet({ meal, onClose }: { meal: MealDef; onClose: () => void }) {
  const [name, setName] = useState(meal.label);
  const [confirm, setConfirm] = useState(false);
  const custom = isCustomMeal(meal.id);
  return (
    <Sheet open onClose={onClose} title={meal.label}>
      <div className="flex gap-2">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} aria-label="Meal name" />
        <Button
          disabled={!name.trim() || name.trim() === meal.label}
          onClick={() => {
            useApp.getState().renameMeal(meal.id, name);
            onClose();
          }}
        >
          <Pencil size={16} /> Rename
        </Button>
      </div>
      {custom ? (
        <Button variant="danger" className="mt-3 w-full" onClick={() => setConfirm(true)}>
          <Trash2 size={16} /> Delete meal
        </Button>
      ) : (
        <p className="mt-3 text-xs text-tx3">Breakfast, Lunch, Dinner and Snacks can be renamed but not deleted.</p>
      )}
      <Confirm
        open={confirm}
        title={`Delete “${meal.label}”?`}
        message="Foods already logged in this meal move to Snacks."
        confirmLabel="Delete meal"
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          useApp.getState().deleteMeal(meal.id);
          onClose();
        }}
      />
    </Sheet>
  );
}

function QuickNumberSheet({
  open,
  title,
  initial,
  suffix,
  step,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  initial: number | null;
  suffix: string;
  step?: string;
  onClose: () => void;
  onSave: (v: number | null) => void;
}) {
  const [v, setV] = useState<number | null>(initial);
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setV(initial);
  }
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <NumberInput value={v} onChange={setV} suffix={suffix} step={step} className="text-lg" />
      <div className="mt-4 flex gap-2">
        {initial != null && (
          <Button
            variant="danger"
            onClick={() => {
              onSave(null);
              onClose();
            }}
          >
            Clear
          </Button>
        )}
        <Button
          className="flex-1"
          onClick={() => {
            onSave(v);
            onClose();
          }}
        >
          Save
        </Button>
      </div>
    </Sheet>
  );
}
