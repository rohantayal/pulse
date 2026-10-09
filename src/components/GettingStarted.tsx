import { useMemo } from "react";
import { Check, X } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store/app";
import { useUi } from "../store/ui";
import { calorieStatus, sumEntries } from "../lib/nutrition";
import { todayKey } from "../lib/date";

/** A short first-week checklist that ticks itself off from real data. */
export function GettingStarted() {
  const { onboarded, checklistDismissed, foodLog, workouts, routines, nutritionGoals } = useApp();
  const { push, setAdd } = useUi();

  const greenDay = useMemo(() => {
    const byDay = new Map<string, typeof foodLog>();
    for (const e of foodLog) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
    for (const [, entries] of byDay) {
      const kcal = sumEntries(entries).calories;
      // a "green day" needs a real day of eating, not one snack
      if (kcal >= nutritionGoals.calories * 0.6 && calorieStatus(kcal, nutritionGoals.calories, nutritionGoals.overAllowance) === "good") return true;
    }
    return false;
  }, [foodLog, nutritionGoals]);

  if (!onboarded || checklistDismissed) return null;

  const items = [
    { done: foodLog.length > 0, label: "Log your first meal", action: () => push({ kind: "logFood", meal: "breakfast", date: todayKey() }) },
    { done: workouts.length > 0, label: "Finish a workout", action: () => setAdd(true) },
    { done: routines.length > 0, label: "Build a workout routine", action: () => push({ kind: "routineEditor" }) },
    { done: greenDay, label: "Have a green day — eat close to your goal", action: undefined },
  ];
  const doneCount = items.filter((i) => i.done).length;
  const all = doneCount === items.length;

  return (
    <div className="mb-3 rounded-2xl border border-acc/30 bg-acc/10 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[15px] font-semibold">{all ? "You're up and running 🎉" : "Getting started"}</div>
          <div className="text-xs text-tx2">
            {doneCount} of {items.length} done
          </div>
        </div>
        <button onClick={() => useApp.getState().dismissChecklist()} className="rounded-full p-1 text-tx3 active:bg-surf2" aria-label="Hide checklist">
          <X size={18} />
        </button>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-surf3">
        <div className="h-full rounded-full bg-acc transition-[width] duration-500" style={{ width: `${(doneCount / items.length) * 100}%` }} />
      </div>
      <ul className="mt-3 space-y-1">
        {items.map((it) => (
          <li key={it.label}>
            <button
              onClick={it.done ? undefined : it.action}
              disabled={it.done || !it.action}
              className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left text-sm disabled:cursor-default"
            >
              <span
                className={clsx(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  it.done ? "border-good bg-good text-white" : "border-tx3",
                )}
              >
                {it.done && <Check size={13} strokeWidth={3} />}
              </span>
              <span className={clsx(it.done ? "text-tx3 line-through" : "text-tx")}>{it.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
