import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Zap } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store/app";
import { useUi } from "../store/ui";
import type { Habit } from "../types";
import { AUTO_HABITS, HABIT_EMOJIS, bestStreak, completionRate, habitEmoji, isDue, progress, scheduleLabel, streak, type DayData } from "../lib/habits";
import { addDays, dayNum, longDate, monthShort, todayKey, weekStart } from "../lib/date";
import { Button, Card, Confirm, Field, NumberInput, PageHeader, Screen, SectionTitle, inputCls } from "../components/ui";

/** Ideas for your own habits — they only fill in the form. */
const IDEAS: { name: string; target: number; unit?: string; emoji: string }[] = [
  { name: "Drink water", target: 8, unit: "glasses", emoji: "💧" },
  { name: "Read 10 pages", target: 1, emoji: "📖" },
  { name: "Sleep 8 hours", target: 1, emoji: "😴" },
  { name: "Meditate", target: 1, emoji: "🧘" },
  { name: "No sugar", target: 1, emoji: "🍬" },
  { name: "Walk 20 minutes", target: 1, emoji: "🚶" },
];

// Mon … Sun, as JS weekday numbers
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LETTER: Record<number, string> = { 0: "S", 1: "M", 2: "T", 3: "W", 4: "T", 5: "F", 6: "S" };

/** New habit (suggestions + your own), or edit an existing one. */
export function HabitEditor({ habitId }: { habitId?: string }) {
  const { pop, showToast } = useUi();
  const habits = useApp((s) => s.habits);
  const existing = habits.find((h) => h.id === habitId);
  const [name, setName] = useState(existing?.name ?? "");
  const [counted, setCounted] = useState((existing?.target ?? 1) > 1);
  const [target, setTarget] = useState<number | null>(existing && existing.target > 1 ? existing.target : 8);
  const [unit, setUnit] = useState(existing?.unit ?? "");
  const [days, setDays] = useState<number[]>(existing?.days ?? []);
  // undefined = follow the name (💧 for "water"…) until you pick one yourself
  const [emoji, setEmoji] = useState<string | undefined>(existing?.emoji);
  const shownEmoji = habitEmoji({ emoji, name, auto: existing?.auto });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const unusedAuto = AUTO_HABITS.filter((a) => !habits.some((h) => h.auto === a.auto));
  const valid = name.trim() !== "" && (!counted || (target != null && target >= 2));
  const everyDay = days.length === 0;
  const toggleDay = (d: number) => {
    const base = everyDay ? WEEK_ORDER : days;
    const next = base.includes(d) ? base.filter((x) => x !== d) : [...base, d];
    setDays(next.length === 7 ? [] : next.length === 0 ? days : next);
  };

  function save() {
    if (!valid) return;
    const fields = { name: name.trim(), emoji, target: existing?.auto ? 1 : counted ? Math.round(target!) : 1, unit: counted ? unit.trim() || undefined : undefined, days };
    if (existing) useApp.getState().updateHabit(existing.id, fields);
    else useApp.getState().addHabit(fields);
    showToast(existing ? "Habit updated" : "Habit added");
    pop();
  }

  return (
    <Screen>
      <PageHeader
        title={existing ? "Edit habit" : "New habit"}
        onBack={pop}
        right={
          <Button variant="ghost" className="h-9 px-2" disabled={!valid} onClick={save}>
            Save
          </Button>
        }
      />
      <div className="space-y-4 px-3 pb-12">
        {!existing && unusedAuto.length > 0 && (
          <div>
            <SectionTitle>Ticks itself</SectionTitle>
            <Card className="divide-y divide-line p-0">
              {unusedAuto.map((a) => (
                <div key={a.auto} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surf2 text-lg">{a.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-tx3">{a.hint}</div>
                  </div>
                  <button
                    onClick={() => {
                      useApp.getState().addHabit({ name: a.name, auto: a.auto, emoji: a.emoji, target: 1, days: [] });
                      showToast(`Added “${a.name}”`);
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surf2 text-acc"
                    aria-label={`Add ${a.name}`}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              ))}
            </Card>
          </div>
        )}

        {!existing && <SectionTitle>Your own</SectionTitle>}
        <Card className="space-y-4">
          <Field label="Name">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Read 10 pages" autoFocus={!!existing} />
          </Field>
          {!existing && !name && (
            <div className="-mt-2 flex flex-wrap gap-1.5">
              {IDEAS.map((i) => (
                <button
                  key={i.name}
                  onClick={() => {
                    setName(i.name);
                    setCounted(i.target > 1);
                    if (i.target > 1) setTarget(i.target);
                    setUnit(i.unit ?? "");
                    setEmoji(i.emoji);
                  }}
                  className="rounded-full bg-surf2 px-3 py-1.5 text-xs text-tx2 active:bg-surf3"
                >
                  {i.name}
                </button>
              ))}
            </div>
          )}

          <Field label="Icon">
            <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
              {[...new Set([shownEmoji, ...HABIT_EMOJIS])].map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  aria-label={`Icon ${e}`}
                  aria-pressed={e === shownEmoji}
                  className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl", e === shownEmoji ? "bg-acc/20 ring-2 ring-acc" : "bg-surf2")}
                >
                  {e}
                </button>
              ))}
            </div>
          </Field>

          {!existing?.auto && (
            <Field label="Type">
              <div className="grid grid-cols-2 gap-2">
                {[
                  [false, "Tick", "Done or not"],
                  [true, "Count", "e.g. 8 glasses"],
                ].map(([v, label, hint]) => (
                  <button
                    key={String(v)}
                    onClick={() => setCounted(v as boolean)}
                    className={clsx("rounded-xl border-2 px-3 py-2 text-left", counted === v ? "border-acc bg-acc/10" : "border-transparent bg-surf2")}
                  >
                    <div className="text-sm font-semibold">{label as string}</div>
                    <div className="text-xs text-tx3">{hint as string}</div>
                  </button>
                ))}
              </div>
            </Field>
          )}
          {counted && !existing?.auto && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Times a day">
                <NumberInput value={target} onChange={(v) => setTarget(v == null ? null : Math.max(1, Math.round(v)))} step="1" />
              </Field>
              <Field label="Unit (optional)">
                <input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="glasses" />
              </Field>
            </div>
          )}

          <Field label="Days">
            <div className="flex gap-1.5">
              <button
                onClick={() => setDays([])}
                className={clsx("rounded-lg px-3 text-sm font-medium", everyDay ? "bg-acc text-white" : "bg-surf2 text-tx2")}
              >
                Every day
              </button>
              {WEEK_ORDER.map((d) => {
                const on = everyDay || days.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => toggleDay(d)}
                    aria-pressed={on}
                    className={clsx("h-9 flex-1 rounded-lg text-sm font-semibold", on && !everyDay ? "bg-acc text-white" : on ? "bg-acc/20 text-acc" : "bg-surf2 text-tx3")}
                  >
                    {DAY_LETTER[d]}
                  </button>
                );
              })}
            </div>
          </Field>
        </Card>

        <Button className="w-full" disabled={!valid} onClick={save}>
          {existing ? "Save changes" : "Add habit"}
        </Button>
        {existing && (
          <Button variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={16} /> Delete habit
          </Button>
        )}
      </div>
      <Confirm
        open={confirmDelete}
        title={`Delete “${existing?.name}”?`}
        message="Its history and streak are deleted too."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (existing) useApp.getState().deleteHabit(existing.id);
          setConfirmDelete(false);
          // leave both the editor and the habit's page
          const ui = useUi.getState();
          ui.pop();
          if (ui.stack[ui.stack.length - 1]?.kind === "habitDetail") useUi.getState().pop();
        }}
      />
    </Screen>
  );
}

/** One habit: streaks, completion and a 12-week grid. */
export function HabitDetail({ habitId }: { habitId: string }) {
  const { pop, push } = useUi();
  const h = useApp((s) => s.habits.find((x) => x.id === habitId));
  const log = useApp((s) => s.habitLog);
  const foodLog = useApp((s) => s.foodLog);
  const workouts = useApp((s) => s.workouts);
  const goals = useApp((s) => s.nutritionGoals);
  const data: DayData = useMemo(() => ({ foodLog, workouts, goals }), [foodLog, workouts, goals]);

  if (!h) {
    return (
      <Screen>
        <PageHeader title="Habit" onBack={pop} />
        <div className="px-6 py-10 text-center text-tx2">This habit was deleted.</div>
      </Screen>
    );
  }

  const today = todayKey();
  const rate = completionRate(h, log, data);
  const cur = streak(h, log, data);
  const best = bestStreak(h, log, data);
  const auto = AUTO_HABITS.find((a) => a.auto === h.auto);

  return (
    <Screen>
      <PageHeader
        title={`${habitEmoji(h)}  ${h.name}`}
        subtitle={h.auto ? "Ticks itself" : `${scheduleLabel(h)}${h.target > 1 ? ` · ${h.target} ${h.unit ?? "times"} a day` : ""}`}
        onBack={pop}
        right={
          <button onClick={() => push({ kind: "habitEditor", habitId: h.id })} className="flex h-10 w-10 items-center justify-center rounded-full active:bg-surf2" aria-label="Edit habit">
            <Pencil size={18} />
          </button>
        }
      />
      <div className="px-3 pb-12">
        {auto && (
          <Card className="mb-3 flex items-center gap-2 text-sm text-tx2">
            <Zap size={16} className="shrink-0 text-acc" /> {auto.hint}.
          </Card>
        )}
        {!h.auto && isDue(h, today) && <TodayControl habit={h} count={progress(h, today, log, data).count} />}

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Current streak" value={`${cur}`} unit={cur === 1 ? "day" : "days"} />
          <Stat label="Best streak" value={`${best}`} unit={best === 1 ? "day" : "days"} />
          <Stat label="Last 30 days" value={rate == null ? "–" : `${Math.round(rate * 100)}%`} />
        </div>

        <SectionTitle>Last 12 weeks</SectionTitle>
        <Card>
          <HabitGrid habit={h} today={today} done={(d) => progress(h, d, log, data)} />
          <div className="mt-3 flex items-center justify-end gap-3 text-[11px] text-tx3">
            <Legend className="bg-good" label="Done" />
            <Legend className="bg-good/40" label="Partly" />
            <Legend className="bg-surf3" label="Missed" />
            <Legend className="border border-line" label="Not due" />
          </div>
        </Card>
      </div>
    </Screen>
  );
}

function HabitGrid({ habit, today, done }: { habit: Habit; today: string; done: (date: string) => { count: number; done: boolean } }) {
  const start = addDays(weekStart(today), -7 * 11);
  const weeks = Array.from({ length: 12 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  return (
    <div>
      <div className="grid grid-cols-[1rem_repeat(12,1fr)] gap-1">
        <div />
        {weeks.map((w, i) => (
          <div key={i} className="text-center text-[9px] text-tx3">
            {i % 3 === 0 ? `${dayNum(w[0])} ${monthShort(w[0])}` : ""}
          </div>
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((row) => (
          <Row key={row} row={row} weeks={weeks} habit={habit} today={today} done={done} />
        ))}
      </div>
    </div>
  );
}

function Row({ row, weeks, habit, today, done }: { row: number; weeks: string[][]; habit: Habit; today: string; done: (d: string) => { count: number; done: boolean } }) {
  return (
    <>
      <div className="flex items-center text-[9px] text-tx3">{row % 2 === 0 ? "MTWTFSS"[row] : ""}</div>
      {weeks.map((w) => {
        const d = w[row];
        const isFuture = d > today;
        const due = !isFuture && isDue(habit, d);
        const p = due ? done(d) : null;
        const cls = isFuture
          ? "bg-transparent"
          : !due
            ? "border border-line"
            : p!.done
              ? "bg-good"
              : p!.count > 0
                ? "bg-good/40"
                : d === today
                  ? "border border-tx3"
                  : "bg-surf3";
        return <div key={d} title={longDate(d)} className={clsx("aspect-square rounded-[3px]", cls)} />;
      })}
    </>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <Card className="text-center">
      <div className="text-[22px] font-bold tabular-nums">{value}</div>
      <div className="text-[11px] text-tx3">{unit ?? " "}</div>
      <div className="mt-1 text-xs text-tx2">{label}</div>
    </Card>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={clsx("h-2.5 w-2.5 rounded-[3px]", className)} />
      {label}
    </span>
  );
}

/** Today's progress for your own habit, with − / + to correct a count. */
function TodayControl({ habit, count }: { habit: Habit; count: number }) {
  const today = todayKey();
  const set = (n: number) => useApp.getState().setHabitCount(today, habit.id, Math.max(0, n));
  const done = count >= habit.target;
  return (
    <Card className="mb-3 flex items-center gap-3">
      <div className="flex-1">
        <div className="text-xs text-tx3">Today</div>
        <div className={clsx("text-lg font-semibold", done && "text-good")}>
          {habit.target > 1 ? `${count} / ${habit.target} ${habit.unit ?? ""}`.trim() : done ? "Done" : "Not done yet"}
        </div>
      </div>
      {habit.target > 1 ? (
        <div className="flex items-center gap-2">
          <button onClick={() => set(count - 1)} disabled={count === 0} className="flex h-10 w-10 items-center justify-center rounded-full bg-surf2 text-xl disabled:opacity-30" aria-label="One less">
            −
          </button>
          <button onClick={() => set(count + 1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-acc text-xl text-white" aria-label="One more">
            +
          </button>
        </div>
      ) : (
        <Button variant={done ? "secondary" : "primary"} className="h-10" onClick={() => set(done ? 0 : 1)}>
          {done ? "Undo" : "Mark done"}
        </Button>
      )}
    </Card>
  );
}
