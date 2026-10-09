import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store/app";
import { useUi } from "../store/ui";
import type { ExerciseGoals, NutritionGoals } from "../types";
import { addDays, dayNum, dowShort, fromKey, longDate, monthShort, todayKey, weekDays, weekStart, formatDuration } from "../lib/date";
import { fmt } from "../lib/format";
import { macroCalories } from "../lib/nutrition";
import { dayStats } from "../lib/day";
import { exercisesVolume } from "../lib/workout";
import { Button, Card, Field, NumberInput, PageHeader, ProgressBar, Screen, SectionTitle, inputCls } from "../components/ui";
import { BarChart, LineChart } from "../components/Charts";

const C = { carbs: "#199e70", protein: "#3987e5", fat: "#d95926", cal: "#3fb96b", steps: "#3fb96b", burn: "#d95926" };

// ---------------------------------------------------------------- Nutrition goals

const PRESETS: { name: string; c: number; p: number; f: number }[] = [
  { name: "Balanced", c: 45, p: 25, f: 30 },
  { name: "High protein", c: 35, p: 35, f: 30 },
  { name: "Low carb", c: 20, p: 35, f: 45 },
];

export function NutritionGoalsPage() {
  const { pop, showToast } = useUi();
  const current = useApp((s) => s.nutritionGoals);
  const [g, setG] = useState<NutritionGoals>(current);
  const macroKcal = macroCalories(g);
  const pct = (kcal: number) => (macroKcal > 0 ? Math.round((kcal / macroKcal) * 100) : 0);

  function applyPreset(p: (typeof PRESETS)[number]) {
    setG((x) => ({
      ...x,
      carbs: Math.round((x.calories * p.c) / 100 / 4),
      protein: Math.round((x.calories * p.p) / 100 / 4),
      fat: Math.round((x.calories * p.f) / 100 / 9),
    }));
  }

  return (
    <Screen>
      <PageHeader title="Nutrition goals" onBack={pop} />
      <div className="space-y-4 px-4 pb-10">
        <Card>
          <Field label="Daily calories">
            <NumberInput value={g.calories} onChange={(v) => setG({ ...g, calories: Math.max(0, Math.round(v ?? 0)) })} suffix="kcal" step="1" />
          </Field>
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">Macros (grams per day)</div>
          </div>
          <div className="mb-4 flex gap-2">
            {PRESETS.map((p) => (
              <button key={p.name} onClick={() => applyPreset(p)} className="flex-1 rounded-lg bg-surf2 px-2 py-2 text-xs font-medium text-tx2 active:bg-surf3">
                {p.name}
                <div className="text-[10px] text-tx3">
                  {p.c}/{p.p}/{p.f}
                </div>
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {(
              [
                ["carbs", "Carbs", 4],
                ["protein", "Protein", 4],
                ["fat", "Fat", 9],
              ] as const
            ).map(([k, label, kcalPerG]) => (
              <div key={k} className="grid grid-cols-[1fr_7rem] items-center gap-3">
                <div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: C[k] }} />
                    {label}
                  </div>
                  <div className="text-xs text-tx2">
                    {fmt(g[k] * kcalPerG)} kcal · {pct(g[k] * kcalPerG)}%
                  </div>
                </div>
                <NumberInput value={g[k]} onChange={(v) => setG({ ...g, [k]: Math.max(0, Math.round(v ?? 0)) })} suffix="g" step="1" />
              </div>
            ))}
          </div>
          {/* split bar */}
          {macroKcal > 0 && (
            <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              <div style={{ width: `${pct(g.carbs * 4)}%`, background: C.carbs }} />
              <div style={{ width: `${pct(g.protein * 4)}%`, background: C.protein }} />
              <div style={{ width: `${pct(g.fat * 9)}%`, background: C.fat }} />
            </div>
          )}
          <div className={clsx("mt-3 text-xs", Math.abs(macroKcal - g.calories) > g.calories * 0.05 ? "text-gold" : "text-tx2")}>
            Macros add up to {fmt(macroKcal)} kcal
            {Math.abs(macroKcal - g.calories) > g.calories * 0.05 && ` — ${fmt(Math.abs(macroKcal - g.calories))} kcal ${macroKcal > g.calories ? "over" : "under"} your calorie goal`}
          </div>
        </Card>
        <Button
          className="w-full"
          onClick={() => {
            useApp.getState().setNutritionGoals(g);
            showToast("Goals saved");
            pop();
          }}
        >
          Save goals
        </Button>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- Week navigation

function useWeek() {
  const [start, setStart] = useState(() => weekStart(todayKey()));
  const days = weekDays(start);
  const end = days[6];
  const label = `${dayNum(start)} ${monthShort(start)} – ${dayNum(end)} ${monthShort(end)}`;
  const isCurrent = start === weekStart(todayKey());
  return {
    days,
    label,
    nav: (
      <div className="mb-3 flex items-center justify-between rounded-2xl bg-surf px-2 py-1.5">
        <button onClick={() => setStart(addDays(start, -7))} className="rounded-full p-2 active:bg-surf2" aria-label="Previous week">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold">{label}</div>
          <div className="text-[11px] text-tx2">{isCurrent ? "This week" : `${fromKey(start).getFullYear()}`}</div>
        </div>
        <button onClick={() => setStart(addDays(start, 7))} disabled={isCurrent} className="rounded-full p-2 active:bg-surf2 disabled:opacity-30" aria-label="Next week">
          <ChevronRight size={20} />
        </button>
      </div>
    ),
  };
}

// ---------------------------------------------------------------- Nutrition weekly summary

export function NutritionWeeklyPage() {
  const pop = useUi((s) => s.pop);
  const { foodLog, workouts, steps, weights, nutritionGoals: goals } = useApp();
  const { days, nav } = useWeek();
  const stats = useMemo(() => days.map((d) => ({ d, s: dayStats(d, { foodLog, workouts, steps, weights }) })), [days.join(), foodLog, workouts, steps, weights]);
  const logged = stats.filter((x) => x.s.food.calories > 0);
  const n = Math.max(1, logged.length);
  const avg = {
    calories: logged.reduce((a, x) => a + x.s.food.calories, 0) / n,
    carbs: logged.reduce((a, x) => a + x.s.food.carbs, 0) / n,
    protein: logged.reduce((a, x) => a + x.s.food.protein, 0) / n,
    fat: logged.reduce((a, x) => a + x.s.food.fat, 0) / n,
  };
  const totalEaten = logged.reduce((a, x) => a + x.s.food.calories, 0);
  const totalBudget = logged.reduce((a, x) => a + goals.calories + x.s.exercise, 0);
  const net = totalBudget - totalEaten;
  const mk = macroCalories(avg);

  return (
    <Screen>
      <PageHeader title="Nutrition · Weekly summary" onBack={pop} />
      <div className="px-3 pb-10">
        {nav}
        <Card>
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-semibold">Calories eaten</div>
            <div className="text-xs text-tx2">{logged.length}/7 days logged</div>
          </div>
          <BarChart data={stats.map((x) => ({ key: x.d, label: dowShort(x.d), value: Math.round(x.s.food.calories) }))} goal={goals.calories} color={C.cal} unit="kcal" />
        </Card>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Card>
            <div className="text-xs text-tx2">Daily average</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{fmt(avg.calories)}</div>
            <div className="text-xs text-tx3">goal {fmt(goals.calories)} kcal</div>
          </Card>
          <Card>
            <div className="text-xs text-tx2">{net >= 0 ? "Weekly deficit" : "Weekly surplus"}</div>
            <div className={clsx("mt-1 text-2xl font-bold tabular-nums", net >= 0 ? "text-good" : "text-bad")}>{fmt(Math.abs(net))}</div>
            <div className="text-xs text-tx3">kcal vs goal + exercise</div>
          </Card>
        </div>

        <SectionTitle>Average macros</SectionTitle>
        <Card className="space-y-4">
          {(
            [
              ["carbs", "Carbs", 4],
              ["protein", "Protein", 4],
              ["fat", "Fat", 9],
            ] as const
          ).map(([k, label, f]) => (
            <div key={k}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: C[k] }} />
                  {label}
                </span>
                <span className="tabular-nums">
                  {fmt(avg[k])}
                  <span className="text-tx2">/{goals[k]} g</span>
                  <span className="ml-2 text-xs text-tx3">{mk > 0 ? Math.round(((avg[k] * f) / mk) * 100) : 0}%</span>
                </span>
              </div>
              <ProgressBar value={avg[k]} max={goals[k]} color={C[k]} />
            </div>
          ))}
        </Card>

        <SectionTitle>Day by day</SectionTitle>
        <Card className="divide-y divide-line p-0">
          {stats.map(({ d, s }) => (
            <div key={d} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-tx2">{longDate(d).slice(0, -5)}</span>
              <span className="tabular-nums">
                {s.food.calories > 0 ? (
                  <>
                    {fmt(s.food.calories)} kcal <span className="text-xs text-tx3">· P {fmt(s.food.protein)}g</span>
                  </>
                ) : (
                  <span className="text-tx3">—</span>
                )}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- Weight

export function WeightPage() {
  const pop = useUi((s) => s.pop);
  const weights = useApp((s) => s.weights);
  const setWeight = useApp((s) => s.setWeight);
  const [date, setDate] = useState(todayKey());
  const [kg, setKg] = useState<number | null>(weights[weights.length - 1]?.kg ?? null);
  const [range, setRange] = useState<30 | 90 | 0>(90);

  const shown = useMemo(() => {
    const from = range ? addDays(todayKey(), -range) : "";
    return weights.filter((w) => w.date >= from);
  }, [weights, range]);

  const first = weights[0];
  const last = weights[weights.length - 1];
  const change = first && last ? last.kg - first.kg : 0;

  return (
    <Screen>
      <PageHeader title="Weight tracker" onBack={pop} />
      <div className="px-3 pb-10">
        <div className="grid grid-cols-3 gap-2">
          <Card className="text-center">
            <div className="text-xs text-tx2">Current</div>
            <div className="text-lg font-bold tabular-nums">{last ? fmt(last.kg, 1) : "–"}</div>
          </Card>
          <Card className="text-center">
            <div className="text-xs text-tx2">Start</div>
            <div className="text-lg font-bold tabular-nums">{first ? fmt(first.kg, 1) : "–"}</div>
          </Card>
          <Card className="text-center">
            <div className="text-xs text-tx2">Change</div>
            <div className={clsx("text-lg font-bold tabular-nums", change < 0 ? "text-good" : change > 0 ? "text-gold" : "")}>
              {first ? `${change > 0 ? "+" : ""}${fmt(change, 1)}` : "–"}
            </div>
          </Card>
        </div>

        <Card className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Body weight (kg)</div>
            <div className="flex gap-1 rounded-lg bg-surf2 p-0.5 text-xs">
              {([30, 90, 0] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)} className={clsx("rounded-md px-2 py-1 font-medium", range === r ? "bg-surf3 text-tx" : "text-tx2")}>
                  {r ? `${r}D` : "All"}
                </button>
              ))}
            </div>
          </div>
          {shown.length > 0 ? (
            <LineChart data={shown.map((w) => ({ key: w.date, label: `${dayNum(w.date)} ${monthShort(w.date)}`, value: w.kg }))} color={C.protein} unit="kg" />
          ) : (
            <div className="py-10 text-center text-sm text-tx2">Log your weight to see the trend.</div>
          )}
        </Card>

        <SectionTitle>Log weight</SectionTitle>
        <Card className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input type="date" className={inputCls} value={date} max={todayKey()} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </Field>
            <Field label="Weight">
              <NumberInput value={kg} onChange={setKg} suffix="kg" />
            </Field>
          </div>
          <Button className="w-full" disabled={!kg || kg <= 0} onClick={() => kg && setWeight(date, kg)}>
            Save entry
          </Button>
        </Card>

        {weights.length > 0 && (
          <>
            <SectionTitle>History</SectionTitle>
            <Card className="divide-y divide-line p-0">
              {[...weights].reverse().map((w) => (
                <div key={w.date} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-tx2">{longDate(w.date)}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums">{fmt(w.kg, 1)} kg</span>
                    <button onClick={() => setWeight(w.date, null)} className="text-tx3 active:text-bad" aria-label="Delete entry">
                      <Trash2 size={15} />
                    </button>
                  </span>
                </div>
              ))}
            </Card>
          </>
        )}
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- Exercise goals

export function ExerciseGoalsPage() {
  const { pop, showToast } = useUi();
  const current = useApp((s) => s.exerciseGoals);
  const [g, setG] = useState<ExerciseGoals>(current);
  const num = (k: keyof ExerciseGoals) => (v: number | null) => setG({ ...g, [k]: Math.max(0, Math.round(v ?? 0)) });
  return (
    <Screen>
      <PageHeader title="Exercise goals" onBack={pop} />
      <div className="space-y-4 px-4 pb-10">
        <Card className="space-y-4">
          <div className="text-sm font-semibold">Exercise</div>
          <Field label="Calories burned per day">
            <NumberInput value={g.calories} onChange={num("calories")} suffix="kcal" step="1" />
          </Field>
          <Field label="Active minutes per day">
            <NumberInput value={g.minutes} onChange={num("minutes")} suffix="min" step="1" />
          </Field>
          <Field label="Workouts per week">
            <div className="grid grid-cols-7 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  onClick={() => setG({ ...g, workoutsPerWeek: n })}
                  className={clsx("rounded-lg py-2 text-sm font-semibold", g.workoutsPerWeek === n ? "bg-acc text-white" : "bg-surf2 text-tx2")}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>
        </Card>
        <Card className="space-y-4">
          <div className="text-sm font-semibold">Steps</div>
          <Field label="Daily step goal">
            <NumberInput value={g.steps} onChange={num("steps")} suffix="steps" step="1" />
          </Field>
          <div className="flex gap-2">
            {[6000, 8000, 10000, 12000].map((s) => (
              <button key={s} onClick={() => setG({ ...g, steps: s })} className={clsx("flex-1 rounded-lg py-1.5 text-xs font-medium", g.steps === s ? "bg-acc text-white" : "bg-surf2 text-tx2")}>
                {fmt(s / 1000)}k
              </button>
            ))}
          </div>
        </Card>
        <Button
          className="w-full"
          onClick={() => {
            useApp.getState().setExerciseGoals(g);
            showToast("Goals saved");
            pop();
          }}
        >
          Save goals
        </Button>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- Exercise weekly summary

export function ExerciseWeeklyPage() {
  const pop = useUi((s) => s.pop);
  const { foodLog, workouts, steps, weights, exerciseGoals: goals } = useApp();
  const { days, nav } = useWeek();
  const stats = useMemo(() => days.map((d) => ({ d, s: dayStats(d, { foodLog, workouts, steps, weights }) })), [days.join(), foodLog, workouts, steps, weights]);
  const weekWorkouts = stats.flatMap((x) => x.s.workouts);
  const totalMs = weekWorkouts.reduce((a, w) => a + (w.endedAt - w.startedAt), 0);
  const volume = weekWorkouts.reduce((a, w) => a + exercisesVolume(w.exercises), 0);
  const burned = stats.reduce((a, x) => a + x.s.exercise, 0);
  const totalSteps = stats.reduce((a, x) => a + x.s.steps, 0);

  return (
    <Screen>
      <PageHeader title="Exercise · Weekly summary" onBack={pop} />
      <div className="px-3 pb-10">
        {nav}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-tx2">Workouts</div>
              <div className="text-2xl font-bold tabular-nums">
                {weekWorkouts.length}
                <span className="text-base font-medium text-tx2">/{goals.workoutsPerWeek}</span>
              </div>
            </div>
            <div className="flex gap-1.5">
              {stats.map(({ d, s }) => (
                <div key={d} className="flex flex-col items-center gap-1">
                  <div className={clsx("h-7 w-7 rounded-full", s.workouts.length ? "bg-acc" : "bg-surf3")} />
                  <span className="text-[10px] text-tx3">{dowShort(d).charAt(0)}</span>
                </div>
              ))}
            </div>
          </div>
          <ProgressBar value={weekWorkouts.length} max={goals.workoutsPerWeek} color={C.protein} className="mt-3" />
        </Card>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Card className="text-center">
            <div className="text-xs text-tx2">Time</div>
            <div className="text-[15px] font-bold tabular-nums">{totalMs ? formatDuration(totalMs) : "0m"}</div>
          </Card>
          <Card className="text-center">
            <div className="text-xs text-tx2">Volume</div>
            <div className="text-[15px] font-bold tabular-nums">{fmt(volume)} kg</div>
          </Card>
          <Card className="text-center">
            <div className="text-xs text-tx2">Steps</div>
            <div className="text-[15px] font-bold tabular-nums">{fmt(totalSteps)}</div>
          </Card>
        </div>

        <Card className="mt-3">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-semibold">Calories burned</div>
            <div className="text-xs text-tx2">{fmt(burned)} kcal total</div>
          </div>
          <BarChart data={stats.map((x) => ({ key: x.d, label: dowShort(x.d), value: x.s.exercise }))} goal={goals.calories} color={C.burn} unit="kcal burned" />
        </Card>

        <SectionTitle>Workouts this week</SectionTitle>
        {weekWorkouts.length === 0 ? (
          <Card className="text-center text-sm text-tx2">No workouts this week.</Card>
        ) : (
          <Card className="divide-y divide-line p-0">
            {weekWorkouts.map((w) => (
              <div key={w.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <div className="font-medium">{w.name}</div>
                  <div className="text-xs text-tx2">{longDate(w.date)}</div>
                </div>
                <div className="text-right text-xs text-tx2">
                  {formatDuration(w.endedAt - w.startedAt)}
                  <div>{w.caloriesBurned} kcal</div>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- Steps

export function StepsPage() {
  const pop = useUi((s) => s.pop);
  const steps = useApp((s) => s.steps);
  const goal = useApp((s) => s.exerciseGoals.steps);
  const setSteps = useApp((s) => s.setSteps);
  const [range, setRange] = useState<7 | 30>(7);
  const [date, setDate] = useState(todayKey());
  const [val, setVal] = useState<number | null>(steps.find((s) => s.date === todayKey())?.steps ?? null);

  const days = useMemo(() => Array.from({ length: range }, (_, i) => addDays(todayKey(), i - range + 1)), [range]);
  const data = days.map((d) => ({ key: d, label: range === 7 ? dowShort(d) : String(dayNum(d)), value: steps.find((s) => s.date === d)?.steps ?? 0 }));
  const logged = data.filter((d) => d.value > 0);
  const avg = logged.length ? logged.reduce((a, d) => a + d.value, 0) / logged.length : 0;
  const hit = data.filter((d) => d.value >= goal).length;
  const today = data[data.length - 1].value;

  return (
    <Screen>
      <PageHeader title="Step tracker" onBack={pop} />
      <div className="px-3 pb-10">
        <Card>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-tx2">Today</div>
              <div className="text-3xl font-bold tabular-nums">{fmt(today)}</div>
              <div className="text-xs text-tx3">of {fmt(goal)} steps</div>
            </div>
            <div className="text-right text-xs text-tx2">
              <div>
                Avg <b className="text-tx">{fmt(avg)}</b>
              </div>
              <div>
                Goal hit <b className="text-tx">{hit}</b>/{range} days
              </div>
            </div>
          </div>
          <ProgressBar value={today} max={goal} color={C.steps} className="mt-3 h-2" />
        </Card>

        <Card className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Steps</div>
            <div className="flex gap-1 rounded-lg bg-surf2 p-0.5 text-xs">
              {([7, 30] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)} className={clsx("rounded-md px-2 py-1 font-medium", range === r ? "bg-surf3 text-tx" : "text-tx2")}>
                  {r}D
                </button>
              ))}
            </div>
          </div>
          <BarChart data={data} goal={goal} color={C.steps} unit="steps" />
        </Card>

        <SectionTitle>Log steps</SectionTitle>
        <Card className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input
                type="date"
                className={inputCls}
                value={date}
                max={todayKey()}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setDate(e.target.value);
                  setVal(steps.find((s) => s.date === e.target.value)?.steps ?? null);
                }}
              />
            </Field>
            <Field label="Steps">
              <NumberInput value={val} onChange={setVal} step="1" />
            </Field>
          </div>
          <Button className="w-full" disabled={val == null || val < 0} onClick={() => setSteps(date, val ? Math.round(val) : null)}>
            Save
          </Button>
        </Card>
      </div>
    </Screen>
  );
}
