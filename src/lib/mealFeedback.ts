import type { Macros } from "../types";
import { macroSplit } from "./nutrition";

/**
 * Honest, rule-based feedback for one meal — praise when it's earned, a nudge when it isn't.
 *
 * References (general adult guidance, not medical advice):
 * - Macro ranges (AMDR, US National Academies): carbs 45–65%, fat 20–35%, protein 10–35% of calories.
 * - Protein per meal: ~25–40 g supports fullness and muscle repair.
 * - Calorie split: a main meal is typically ~25–35% of the day, a snack ~10–15%.
 */

export type Tone = "good" | "ok" | "warn" | "bad";

export interface Note {
  tone: Tone;
  text: string;
}

export interface Feedback {
  tone: Tone;
  icon: string;
  title: string;
  notes: Note[];
}

const RANK: Record<Tone, number> = { good: 0, ok: 1, warn: 2, bad: 3 };
const worst = (a: Tone, b: Tone): Tone => (RANK[a] >= RANK[b] ? a : b);

export function isSnackMeal(mealId: string, label: string): boolean {
  return mealId === "snacks" || /snack/i.test(label);
}

/**
 * Judges a meal only by itself — its size against your daily goal and its macro balance.
 * Other meals never change this verdict; how the whole day went is shown on the day cards.
 */
export function mealFeedback(opts: {
  meal: Macros;
  /** Daily calorie goal */
  goal: number;
  snack: boolean;
}): Feedback | null {
  const { meal, goal, snack } = opts;
  if (meal.calories <= 0) return null;

  const share = goal > 0 ? meal.calories / goal : 0;
  const split = macroSplit(meal);
  const notes: Note[] = [];
  let tone: Tone = "good";
  let title = snack ? "Sensible snack" : "Balanced meal";
  let icon = "✅";

  // ---- size of the meal
  if (snack) {
    if (share > 0.25 || meal.calories > 600) {
      tone = "bad";
      title = "Heavy snack";
      icon = "🛑";
      notes.push({ tone: "bad", text: `${fmt(meal.calories)} kcal — that's a full meal's worth (${pct(share)} of your day). Snacks usually sit around 10–15%.` });
    } else if (share > 0.15) {
      tone = "warn";
      title = "Big snack";
      icon = "⚠️";
      notes.push({ tone: "warn", text: `${pct(share)} of your day in a snack. Aim for 10–15% so meals stay on track.` });
    }
  } else if (share > 0.45 || meal.calories > 1100) {
    tone = "bad";
    title = "Very heavy meal";
    icon = "🛑";
    notes.push({
      tone: "bad",
      text: `${fmt(meal.calories)} kcal is ${pct(share)} of your day in one sitting. A main meal is usually 25–35%.`,
    });
  } else if (share > 0.38) {
    tone = "warn";
    title = "Big meal";
    icon = "⚠️";
    notes.push({ tone: "warn", text: `${pct(share)} of your day — a bit above the usual 25–35% for a main meal.` });
  } else if (share < 0.12 && meal.calories < 250) {
    tone = "ok";
    title = "Light meal";
    icon = "🪶";
    notes.push({ tone: "ok", text: `Only ${fmt(meal.calories)} kcal — fine if planned, but you may get hungry before the next meal.` });
  }

  // ---- macro quality (only meaningful once the meal has some substance)
  const substantial = meal.calories >= 200;
  if (substantial && split.fat > 40) {
    tone = worst(tone, "warn");
    notes.push({ tone: "warn", text: `High in fat — ${pct(split.fat / 100)} of calories (aim for 20–35%).` });
  }
  if (substantial && split.carbs > 65) {
    tone = worst(tone, "warn");
    notes.push({ tone: "warn", text: `Carb-heavy — ${pct(split.carbs / 100)} from carbs. Add dal, paneer, eggs or curd to balance it.` });
  }
  if (!snack && meal.protein >= 25) {
    notes.push({ tone: "good", text: `Great protein — ${fmt(meal.protein)} g (25–40 g a meal keeps you full and helps muscle).` });
  } else if (substantial && split.protein < 12) {
    tone = worst(tone, "warn");
    notes.push({ tone: "warn", text: `Low on protein — just ${fmt(meal.protein)} g. Try adding a protein source.` });
  } else if (snack && meal.protein >= 10) {
    notes.push({ tone: "good", text: `Nice — ${fmt(meal.protein)} g protein in a snack.` });
  }
  const balanced = split.carbs >= 40 && split.carbs <= 65 && split.fat >= 20 && split.fat <= 35 && split.protein >= 12;
  if (substantial && balanced && tone !== "bad") {
    notes.push({ tone: "good", text: "Macros are in a healthy range." });
  }

  // Title follows the overall verdict when macros, not size, were the problem
  if (title === "Balanced meal" || title === "Sensible snack") {
    if (tone === "warn") {
      title = snack ? "Snack could be better" : "Could be more balanced";
      icon = "⚠️";
    } else if (notes.some((n) => n.text.startsWith("Great protein"))) {
      title = "Solid meal";
      icon = "💪";
    }
  }

  // Most important first: bad, warn, then good, then neutral info; keep it short.
  const ORDER: Record<Tone, number> = { bad: 0, warn: 1, good: 2, ok: 3 };
  notes.sort((a, b) => ORDER[a.tone] - ORDER[b.tone]);
  return { tone, icon, title, notes: notes.slice(0, 3) };
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

function pct(f: number) {
  return `${Math.round(f * 100)}%`;
}
