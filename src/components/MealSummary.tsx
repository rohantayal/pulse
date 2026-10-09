import clsx from "clsx";
import type { Macros, NutritionGoals } from "../types";
import { fmt } from "../lib/format";
import { BAR_COLOR, GOOD_COLOR, OVER_COLOR, macroSplit } from "../lib/nutrition";
import { mealFeedback, type Tone } from "../lib/mealFeedback";

const TONE_TEXT: Record<Tone, string> = {
  good: "text-good",
  ok: "text-tx2",
  warn: "text-gold",
  bad: "text-bad",
};
const TONE_BG: Record<Tone, string> = {
  good: "bg-good/10 border-good/25",
  ok: "bg-surf2 border-line",
  warn: "bg-gold/10 border-gold/25",
  bad: "bg-bad/10 border-bad/30",
};
const DOT: Record<Tone, string> = { good: "✓", ok: "•", warn: "!", bad: "✕" };

/**
 * Calories | Carbs | Protein | Fat for one meal, plus honest feedback.
 * Calories: the meal's share of the daily goal, green unless the meal itself is heavy.
 * Macros: share of the meal's calories from each macro — adds up to 100%.
 * Used both while logging and on Today, so it looks the same in both places.
 * Everything here depends only on this meal — other meals never change it.
 */
export function MealSummary({
  mealId,
  label,
  meal,
  goals,
  className,
}: {
  mealId: string;
  label: string;
  meal: Macros;
  goals: NutritionGoals;
  className?: string;
}) {
  const split = macroSplit(meal);
  const feedback = mealFeedback({
    meal,
    goal: goals.calories,
    snack: mealId === "snacks" || /snack/i.test(label),
  });
  // Calories go red only when this meal on its own is too heavy
  const kcalColor = feedback?.title.startsWith("Very heavy") || feedback?.title.startsWith("Heavy") ? OVER_COLOR : GOOD_COLOR;

  const cols = [
    { label: "Calories", value: meal.calories, unit: "kcal", pct: goals.calories > 0 ? (meal.calories / goals.calories) * 100 : 0, note: "of day", color: kcalColor },
    { label: "Carbs", value: meal.carbs, unit: "g", pct: split.carbs, note: "of meal", color: BAR_COLOR },
    { label: "Protein", value: meal.protein, unit: "g", pct: split.protein, note: "of meal", color: BAR_COLOR },
    { label: "Fat", value: meal.fat, unit: "g", pct: split.fat, note: "of meal", color: BAR_COLOR },
  ];

  return (
    <div className={className}>
      <div className="grid grid-cols-4 gap-3">
        {cols.map((c) => (
          <div key={c.label} className="min-w-0">
            <div className="truncate text-[11px] font-medium text-tx2">{c.label}</div>
            <div className="mt-1 text-[20px] font-bold leading-none tabular-nums" style={c.label === "Calories" ? { color: c.color } : undefined}>
              {fmt(c.value, c.unit === "g" && c.value < 10 ? 1 : 0)}
            </div>
            <div className="text-[10px] text-tx3">{c.unit}</div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-surf3">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, c.pct)}%`, background: c.color }} />
            </div>
            <div className="mt-1.5 text-[13px] font-semibold tabular-nums">{Math.round(c.pct)}%</div>
            <div className="text-[10px] text-tx3">{c.note}</div>
          </div>
        ))}
      </div>

      {feedback && (
        <div className={clsx("mt-3 rounded-xl border px-3 py-2.5", TONE_BG[feedback.tone])}>
          <div className={clsx("flex items-center gap-2 text-sm font-semibold", TONE_TEXT[feedback.tone])}>
            <span aria-hidden>{feedback.icon}</span>
            {feedback.title}
            <span className="sr-only"> for {label}</span>
          </div>
          {feedback.notes.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {feedback.notes.map((n, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-snug text-tx2">
                  <span className={clsx("w-3 shrink-0 text-center font-bold", TONE_TEXT[n.tone])} aria-hidden>
                    {DOT[n.tone]}
                  </span>
                  <span>{n.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
