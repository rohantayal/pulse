import { useMemo, useRef } from "react";
import { Check, Flame, Plus } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store/app";
import { useUi } from "../store/ui";
import type { Habit } from "../types";
import { AUTO_HABITS, habitEmoji, isDue, progress, shortName, streak, type DayData } from "../lib/habits";
import { todayKey } from "../lib/date";
import { Card, SectionTitle } from "./ui";

/**
 * Today's habits as one row of rings: tap a ring to tick (count habits fill toward their
 * target), tap the name under it — or hold the ring — to open the habit. One row high no
 * matter how many habits there are; it scrolls sideways.
 */
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
    if (h.target === 1) {
      useApp.getState().setHabitCount(date, h.id, count ? 0 : 1);
      if (!count) navigator.vibrate?.(20);
      return;
    }
    if (count >= h.target) return showToast("Done for today — tap its name to adjust");
    useApp.getState().setHabitCount(date, h.id, count + 1);
    if (count + 1 >= h.target) navigator.vibrate?.(20);
  }

  return (
    <div>
      <SectionTitle
        right={
          <span className="flex items-center gap-2">
            {due.length > 0 && (
              <>
                <span className="text-xs font-semibold tabular-nums text-tx2">
                  {doneCount}/{due.length}
                </span>
                <span className="h-1 w-12 overflow-hidden rounded-full bg-surf3">
                  <span className="block h-full rounded-full bg-good transition-[width] duration-500" style={{ width: `${(doneCount / due.length) * 100}%` }} />
                </span>
              </>
            )}
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
        <Card className="relative p-0">
          {/* soft fade on the right edge hints that the row scrolls */}
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 rounded-r-2xl bg-gradient-to-l from-surf to-transparent" />
          <div className="no-scrollbar flex gap-0.5 overflow-x-auto px-2 pb-2 pt-3">
            {due.map((h) => {
              const p = progress(h, date, log, data);
              return (
                <HabitRing
                  key={h.id}
                  habit={h}
                  count={p.count}
                  done={p.done}
                  streak={streak(h, log, data)}
                  onTap={() => tap(h)}
                  onOpen={() => push({ kind: "habitDetail", habitId: h.id })}
                />
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

const SIZE = 52;

export function HabitRing({
  habit,
  count,
  done,
  streak,
  onTap,
  onOpen,
}: {
  habit: Habit;
  count: number;
  done: boolean;
  streak: number;
  onTap: () => void;
  onOpen: () => void;
}) {
  const hold = useRef<number | null>(null);
  const held = useRef(false);
  const r = (SIZE - 5) / 2;
  const c = 2 * Math.PI * r;
  const frac = done ? 1 : Math.min(1, count / habit.target);

  const startHold = () => {
    held.current = false;
    hold.current = window.setTimeout(() => {
      held.current = true;
      navigator.vibrate?.(10);
      onOpen();
    }, 450);
  };
  const endHold = () => {
    if (hold.current) window.clearTimeout(hold.current);
    hold.current = null;
  };

  return (
    <div className="flex w-[58px] shrink-0 flex-col items-center">
      <button
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (held.current) return; // the long-press already opened the habit
          onTap();
        }}
        aria-label={`${habit.name}${habit.target > 1 ? `, ${count} of ${habit.target}` : ""}${done ? ", done" : ""}`}
        aria-pressed={done}
        className="relative flex select-none items-center justify-center rounded-full transition active:scale-90"
        style={{ width: SIZE, height: SIZE, WebkitTouchCallout: "none" }}
      >
        <svg width={SIZE} height={SIZE} className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill={done ? "rgba(63,185,107,0.18)" : "#222226"} stroke="#2c2c31" strokeWidth={3.5} />
          {frac > 0 && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={r}
              fill="none"
              stroke="#3fb96b"
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - frac)}
              style={{ transition: "stroke-dashoffset 350ms ease" }}
            />
          )}
        </svg>
        <span className={clsx("relative text-[22px] leading-none transition", !done && "opacity-80 grayscale-[35%]")}>{habitEmoji(habit)}</span>
        {done && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-surf bg-good text-white">
            <Check size={10} strokeWidth={4} />
          </span>
        )}
        {!done && habit.target > 1 && count > 0 && (
          <span className="absolute -bottom-1 rounded-full bg-surf3 px-1.5 text-[10px] font-semibold tabular-nums text-tx">
            {count}/{habit.target}
          </span>
        )}
      </button>
      <button onClick={onOpen} className="mt-1.5 w-full truncate px-0.5 text-center text-[11px] font-medium text-tx2">
        {shortName(habit.name, habit.auto)}
      </button>
      <div className="flex h-3.5 items-center gap-0.5 text-[10px] font-semibold text-gold">
        {streak > 0 && (
          <>
            <Flame size={10} fill="#f5c542" />
            {streak}
          </>
        )}
      </div>
    </div>
  );
}
