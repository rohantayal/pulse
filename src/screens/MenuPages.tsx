import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useApp, useUnit } from "../store/app";
import { fromUnit } from "../lib/units";
import { buildPlan, goalBlocked, macrosFor, maxPace, splitOf, type GoalType } from "../lib/plan";
import { MacroEditor, macrosMatch, type CaloriesAndMacros } from "../components/MacroEditor";
import { useUi } from "../store/ui";
import type { ExerciseGoals } from "../types";
import { addDays, dayNum, dowShort, fromKey, longDate, monthShort, todayKey, weekDays, weekStart, formatDuration } from "../lib/date";
import { fmt } from "../lib/format";
import { BAR_COLOR, DEFAULT_OVER_ALLOWANCE, GOOD_COLOR, calorieStatus, macroCalories, statusColor } from "../lib/nutrition";
import { dayStats } from "../lib/day";
import { completedSets, exercisesVolume } from "../lib/workout";
import { Button, Card, Field, NumberInput, PageHeader, ProgressBar, Screen, SectionTitle, inputCls } from "../components/ui";
import { BarChart, LineChart } from "../components/Charts";

const C = { carbs: BAR_COLOR, protein: BAR_COLOR, fat: BAR_COLOR, cal: GOOD_COLOR, steps: "#3fb96b", burn: BAR_COLOR };

// ---------------------------------------------------------------- Nutrition goals

export function NutritionGoalsPage() {
  const { pop, showToast } = useUi();
  const current = useApp((s) => s.nutritionGoals);
  // Goals saved before calories and macros were linked may not add up; the editor shows it and
  // typing calories (or a macro) brings them back in line.
  const [v, setV] = useState<CaloriesAndMacros>({ calories: current.calories, protein: current.protein, carbs: current.carbs, fat: current.fat });
  const [allowance, setAllowance] = useState<number>(current.overAllowance ?? DEFAULT_OVER_ALLOWANCE);
  const [editorKey, setEditorKey] = useState(0);
  const valid = v.calories != null && v.calories >= 800 && macrosMatch(v);

  return (
    <Screen>
      <PageHeader title="Nutrition goals" onBack={pop} />
      <div className="space-y-4 px-4 pb-10">
        <Card>
          <div className="mb-3 text-sm font-semibold">Calories & macros</div>
          <MacroEditor key={editorKey} value={v} onChange={setV} presets />

          <div className="mt-5 border-t border-line pt-4">
            <Field
              label="Over-goal allowance"
              hint="A day stays green until you eat this many kcal more than your goal (plus exercise). Beyond that it turns red."
            >
              <NumberInput value={allowance} onChange={(x) => setAllowance(Math.max(0, Math.round(x ?? 0)))} suffix="kcal" step="1" />
            </Field>
            <div className="mt-2 flex gap-2">
              {[0, 50, 100, 200].map((n) => (
                <button
                  key={n}
                  onClick={() => setAllowance(n)}
                  className={clsx("flex-1 rounded-lg py-1.5 text-xs font-medium", allowance === n ? "bg-acc text-white" : "bg-surf2 text-tx2")}
                >
                  {n === 0 ? "Strict" : `±${n}`}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <WeightGoalCard
          onUse={(n) => {
            // Use the plan's split at its calories so the numbers add up exactly
            const kcal = n.calories;
            setV({ calories: kcal, ...macrosFor(kcal, splitOf(n)) });
            setEditorKey((k) => k + 1);
          }}
        />

        <Button
          className="w-full"
          disabled={!valid}
          onClick={() => {
            useApp.getState().setNutritionGoals({ calories: v.calories!, protein: v.protein, carbs: v.carbs, fat: v.fat, overAllowance: allowance });
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

/**
 * Optional: pick lose / maintain / gain and get numbers worked out from your profile
 * (same maths and safety rails as setup). Only fills the form below — nothing changes until Save.
 */
function WeightGoalCard({ onUse }: { onUse: (n: { calories: number; protein: number; carbs: number; fat: number }) => void }) {
  const profile = useApp((s) => s.profile);
  const push = useUi((s) => s.push);
  const { unit, show } = useUnit();
  const [goal, setGoal] = useState<GoalType>(profile?.goal ?? "maintain");
  const [pace, setPace] = useState(profile?.pace ?? 0.5);

  if (!profile) {
    return (
      <Card className="flex items-center gap-3">
        <div className="flex-1 text-sm text-tx2">Want these worked out from your age, height and weight?</div>
        <Button variant="secondary" className="h-9 text-sm" onClick={() => push({ kind: "onboarding" })}>
          Set up
        </Button>
      </Card>
    );
  }

  const p = { ...profile, goal, pace, activity: profile.activity ?? "light" };
  const plan = buildPlan(p);
  const max = maxPace(goal, profile.weightKg);
  const paces = (goal === "lose" ? [0.25, 0.5, 0.75, 1] : [0.25, 0.5]).filter((x) => x <= max);
  const OPTIONS: { id: GoalType; label: string }[] = [
    { id: "lose", label: "Lose" },
    { id: "maintain", label: "Maintain" },
    { id: "gain", label: "Gain" },
  ];

  return (
    <Card>
      <div className="text-sm font-semibold">Weight goal <span className="font-normal text-tx3">· optional</span></div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => {
          const blocked = goalBlocked(o.id, profile);
          return (
            <button
              key={o.id}
              disabled={!!blocked}
              title={blocked ?? undefined}
              onClick={() => {
                setGoal(o.id);
                setPace(o.id === "gain" ? 0.25 : 0.5);
              }}
              className={clsx("rounded-lg py-2 text-sm font-medium disabled:opacity-30", goal === o.id ? "bg-acc text-white" : "bg-surf2 text-tx2")}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {goal !== "maintain" && (
        <div className="mt-2 flex gap-2">
          {paces.map((x) => (
            <button key={x} onClick={() => setPace(x)} className={clsx("flex-1 rounded-lg py-1.5 text-xs font-medium", pace === x ? "bg-surf3 text-tx" : "bg-surf2 text-tx2")}>
              {unit === "lb" ? `${fmt(show(x), 1)} lb` : `${x} kg`}/wk
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 rounded-xl bg-surf2 px-3 py-2.5 text-sm">
        <span className="font-semibold tabular-nums">{fmt(plan.calories)} kcal</span>
        <span className="text-tx2">
          {" "}
          · P {plan.protein} g · C {plan.carbs} g · F {plan.fat} g
        </span>
      </div>
      {plan.notes.map((n) => (
        <p key={n} className="mt-2 text-xs text-gold">
          {n}
        </p>
      ))}
      <Button
        variant="secondary"
        className="mt-3 w-full"
        onClick={() => {
          onUse({ calories: plan.calories, protein: plan.protein, carbs: plan.carbs, fat: plan.fat });
          useApp.getState().updateProfile({ goal, pace });
        }}
      >
        Use these numbers
      </Button>
    </Card>
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
  const { foodLog, workouts, nutritionGoals: goals } = useApp();
  const { days, nav } = useWeek();
  const stats = useMemo(() => days.map((d) => ({ d, s: dayStats(d, { foodLog, workouts }) })), [days.join(), foodLog, workouts]);
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
          <BarChart
            data={stats.map((x) => ({ key: x.d, label: dowShort(x.d), value: Math.round(x.s.food.calories) }))}
            goal={goals.calories}
            color={(i) => statusColor(calorieStatus(stats[i].s.food.calories, goals.calories + stats[i].s.exercise, goals.overAllowance))}
            unit="kcal"
          />
          <div className="mt-1 flex justify-center gap-4 text-[11px] text-tx2">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-good" /> Within goal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-bad" /> Over by more than {fmt(goals.overAllowance ?? DEFAULT_OVER_ALLOWANCE)} kcal
            </span>
          </div>
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
  const { unit, show } = useUnit();
  // The input works in the display unit; it's converted to kg on save.
  const [kg, setKg] = useState<number | null>(weights.length ? show(weights[weights.length - 1].kg) : null);
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
            <div className="text-lg font-bold tabular-nums">{last ? fmt(show(last.kg), 1) : "–"}</div>
          </Card>
          <Card className="text-center">
            <div className="text-xs text-tx2">Start</div>
            <div className="text-lg font-bold tabular-nums">{first ? fmt(show(first.kg), 1) : "–"}</div>
          </Card>
          <Card className="text-center">
            <div className="text-xs text-tx2">Change</div>
            <div className={clsx("text-lg font-bold tabular-nums", change < 0 ? "text-good" : change > 0 ? "text-gold" : "")}>
              {first ? `${change > 0 ? "+" : ""}${fmt(show(change), 1)}` : "–"}
            </div>
          </Card>
        </div>

        <Card className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Body weight ({unit})</div>
            <div className="flex gap-1 rounded-lg bg-surf2 p-0.5 text-xs">
              {([30, 90, 0] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)} className={clsx("rounded-md px-2 py-1 font-medium", range === r ? "bg-surf3 text-tx" : "text-tx2")}>
                  {r ? `${r}D` : "All"}
                </button>
              ))}
            </div>
          </div>
          {shown.length > 0 ? (
            <LineChart data={shown.map((w) => ({ key: w.date, label: `${dayNum(w.date)} ${monthShort(w.date)}`, value: show(w.kg) }))} color={C.protein} unit={unit} />
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
              <NumberInput value={kg} onChange={setKg} suffix={unit} />
            </Field>
          </div>
          <Button className="w-full" disabled={!kg || kg <= 0} onClick={() => kg && setWeight(date, fromUnit(kg, unit))}>
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
                    <span className="font-semibold tabular-nums">
                      {fmt(show(w.kg), 1)} {unit}
                    </span>
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
  const { unit, show } = useUnit();
  const { foodLog, workouts, exerciseGoals: goals } = useApp();
  const { days, nav } = useWeek();
  const stats = useMemo(() => days.map((d) => ({ d, s: dayStats(d, { foodLog, workouts }) })), [days.join(), foodLog, workouts]);
  const weekWorkouts = stats.flatMap((x) => x.s.workouts);
  const totalMs = weekWorkouts.reduce((a, w) => a + (w.endedAt - w.startedAt), 0);
  const volume = weekWorkouts.reduce((a, w) => a + exercisesVolume(w.exercises), 0);
  const burned = stats.reduce((a, x) => a + x.s.exercise, 0);

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
            <div className="text-[15px] font-bold tabular-nums">
              {fmt(show(volume))} {unit}
            </div>
          </Card>
          <Card className="text-center">
            <div className="text-xs text-tx2">Sets</div>
            <div className="text-[15px] font-bold tabular-nums">{fmt(weekWorkouts.reduce((a, w) => a + completedSets(w.exercises), 0))}</div>
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
