import { useMemo } from "react";
import { Check, Flame, Minus, Plus, Zap } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store/app";
import { useUi } from "../store/ui";
import type { Habit } from "../types";
import { AUTO_HABITS, isDue, progress, scheduleLabel, streak, type DayData } from "../lib/habits";
import { todayKey } from "../lib/date";
import { Card, SectionTitle } from "./ui";

/** Today's habits: tap to tick (or +1 for counts); self-ticking ones follow your logged data. */
export function HabitsSection({ date }: { date: string }) {
  const habits = useApp((s) => s.habits);
  const log = useApp((s) => s.habitLog);
  const foodLog = useApp((s) => s.foodLog);
  const workouts = useApp((s) => s.workouts);
  const goals = useApp((s) => s.nutritionGoals);
  const { push, showToast } = useUi();
  const data: DayData = useMemo(() => ({ foodLog, workouts, goals }), [foodLog, workouts, goals]);
  const due = habits.filter((h) => isDue(h, date));
  const doneCount = due.filter((h) => progress(h, date, log, data).done).length;
  const future = date > todayKey();

  function tap(h: Habit) {
    if (h.auto) return showToast(AUTO_HABITS.find((a) => a.auto === h.auto)?.hint ?? "Ticks itself");
    if (future) return showToast("You can tick this on the day");
    const { count } = progress(h, date, log, data);
    const next = h.target === 1 ? (count ? 0 : 1) : count + 1;
    useApp.getState().setHabitCount(date, h.id, next);
    if (next >= h.target && count < h.target) navigator.vibrate?.(20);
  }

  return (
    <div>
      <SectionTitle
        right={
          <span className="flex items-center gap-1">
            {due.length > 0 && <span className="text-xs font-semibold text-tx2">{doneCount}/{due.length}</span>}
            <button onClick={() => push({ kind: "habitEditor" })} className="-mr-1 rounded-full p-1 text-tx3 active:bg-surf2" aria-label="Add habit">
              <Plus size={16} />
            </button>
          </span>
        }
      >
        Habits
      </SectionTitle>
      {habits.length === 0 ? (
        <Card className="flex items-center gap-3">
          <div className="flex-1 text-sm text-tx2">Small things, every day. Add a habit — or let Pulse tick workouts and meals for you.</div>
          <button onClick={() => push({ kind: "habitEditor" })} className="shrink-0 rounded-lg bg-acc px-3 py-2 text-sm font-semibold text-white">
            Add
          </button>
        </Card>
      ) : due.length === 0 ? (
        <Card className="text-sm text-tx3">No habits due on this day.</Card>
      ) : (
        <Card className="divide-y divide-line p-0">
          {due.map((h) => {
            const p = progress(h, date, log, data);
            const s = streak(h, log, data);
            return (
              <div key={h.id} className="flex items-center gap-3 px-4 py-2.5">
                <HabitCircle habit={h} count={p.count} done={p.done} onTap={() => tap(h)} />
                <button onClick={() => push({ kind: "habitDetail", habitId: h.id })} className="min-w-0 flex-1 text-left">
                  <div className={clsx("truncate font-medium", p.done && "text-tx2")}>{h.name}</div>
                  <div className="flex items-center gap-1 text-xs text-tx3">
                    {h.auto ? (
                      <>
                        <Zap size={11} /> Auto
                      </>
                    ) : h.target > 1 ? (
                      `${p.count}/${h.target} ${h.unit ?? ""}`.trim()
                    ) : (
                      scheduleLabel(h)
                    )}
                  </div>
                </button>
                {!h.auto && h.target > 1 && p.count > 0 && !future && (
                  <button
                    onClick={() => useApp.getState().setHabitCount(date, h.id, p.count - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-surf2 text-tx2"
                    aria-label={`One less ${h.name}`}
                  >
                    <Minus size={14} />
                  </button>
                )}
                {s > 0 && (
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-gold" title={`${s} day streak`}>
                    <Flame size={13} fill="#f5c542" /> {s}
                  </span>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

/** Tick circle; for counts a ring that fills toward the target. */
export function HabitCircle({ habit, count, done, onTap, size = 34 }: { habit: Habit; count: number; done: boolean; onTap?: () => void; size?: number }) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, count / habit.target);
  return (
    <button
      onClick={onTap}
      aria-label={done ? `${habit.name}: done` : `Tick ${habit.name}`}
      aria-pressed={done}
      className={clsx("relative flex shrink-0 items-center justify-center rounded-full transition active:scale-90", done ? "bg-good text-white" : "bg-surf2 text-tx2")}
      style={{ width: size, height: size }}
    >
      {!done && habit.target > 1 && count > 0 && (
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#3fb96b" strokeWidth={3} strokeDasharray={c} strokeDashoffset={c * (1 - frac)} strokeLinecap="round" />
        </svg>
      )}
      {done ? (
        <Check size={18} strokeWidth={3} />
      ) : habit.auto ? (
        <Zap size={15} />
      ) : habit.target > 1 ? (
        <span className="text-[11px] font-semibold tabular-nums">{count}</span>
      ) : null}
    </button>
  );
}
