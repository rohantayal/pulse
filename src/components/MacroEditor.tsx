import { useState, type ReactNode } from "react";
import { Check, Flame, Target, Trophy, Utensils } from "lucide-react";
import clsx from "clsx";
import { fmt } from "../lib/format";
import { macroKcal, macrosFor, splitOf, type MacroGrams, type Split } from "../lib/plan";
import { NumberInput } from "./ui";

export interface CaloriesAndMacros extends MacroGrams {
  calories: number | null;
}

/** Calories within this many kcal of what the macros add up to count as matching. */
export const MATCH_TOLERANCE = 4;

export function macrosMatch(v: CaloriesAndMacros): boolean {
  return v.calories != null && Math.abs(macroKcal(v) - v.calories) <= MATCH_TOLERANCE;
}

const PRESETS: { name: string; split: Split }[] = [
  { name: "Balanced", split: { carbs: 0.45, protein: 0.25, fat: 0.3 } },
  { name: "High protein", split: { carbs: 0.35, protein: 0.35, fat: 0.3 } },
  { name: "Low carb", split: { carbs: 0.2, protein: 0.35, fat: 0.45 } },
];

/**
 * Calories + protein/carbs/fat that always agree: editing calories rescales the macros at the
 * same split; editing a macro sets calories to what the macros add up to (4/4/9 kcal per g).
 */
export function MacroEditor({ value, onChange, presets }: { value: CaloriesAndMacros; onChange: (v: CaloriesAndMacros) => void; presets?: boolean }) {
  const [split, setSplit] = useState<Split>(() => splitOf(value));
  const sum = macroKcal(value);
  const matches = macrosMatch(value);
  const pct = (x: number) => Math.round(x * 100);
  const live = splitOf(value);

  const changeCalories = (v: number | null) => {
    if (v == null || v <= 0) return onChange({ ...value, calories: v });
    onChange({ calories: v, ...macrosFor(v, split) });
  };
  const changeMacro = (k: keyof MacroGrams, v: number | null) => {
    const next = { ...value, [k]: Math.max(0, Math.round(v ?? 0)) };
    setSplit(splitOf(next));
    onChange({ ...next, calories: macroKcal(next) });
  };
  const usePreset = (s: Split) => {
    setSplit(s);
    const kcal = value.calories && value.calories > 0 ? value.calories : sum;
    onChange({ calories: kcal, ...macrosFor(kcal, s) });
  };

  return (
    <div className="space-y-3">
      <Row icon={<Target size={18} />} label="Calories" hint="kcal / day">
        <NumberInput value={value.calories} onChange={(v) => changeCalories(v == null ? null : Math.round(v))} step="1" />
      </Row>
      <Row icon={<Trophy size={18} />} label="Protein" hint={`${pct(live.protein)}% of calories`}>
        <NumberInput value={value.protein} onChange={(v) => changeMacro("protein", v)} suffix="g" step="1" />
      </Row>
      <Row icon={<Utensils size={18} />} label="Carbs" hint={`${pct(live.carbs)}% of calories`}>
        <NumberInput value={value.carbs} onChange={(v) => changeMacro("carbs", v)} suffix="g" step="1" />
      </Row>
      <Row icon={<Flame size={18} />} label="Fat" hint={`${pct(live.fat)}% of calories`}>
        <NumberInput value={value.fat} onChange={(v) => changeMacro("fat", v)} suffix="g" step="1" />
      </Row>
      {presets && (
        <div className="flex gap-2 pt-1">
          {PRESETS.map((p) => (
            <button key={p.name} onClick={() => usePreset(p.split)} className="flex-1 rounded-lg bg-surf2 px-2 py-2 text-xs font-medium text-tx2 active:bg-surf3">
              {p.name}
              <div className="text-[10px] text-tx3">
                P{pct(p.split.protein)} · C{pct(p.split.carbs)} · F{pct(p.split.fat)}
              </div>
            </button>
          ))}
        </div>
      )}
      <div className={clsx("flex items-center gap-1.5 border-t border-line pt-3 text-xs", matches ? "text-good" : "text-gold")}>
        {matches && <Check size={14} strokeWidth={3} />}
        {matches ? `Macros add up to ${fmt(sum)} kcal` : `Macros add up to ${fmt(sum)} kcal — enter calories to rebalance`}
      </div>
    </div>
  );
}

function Row({ icon, label, hint, children }: { icon: ReactNode; label: string; hint: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_8rem] items-center gap-3">
      <div className="flex items-center gap-3">
        <span className="text-tx3">{icon}</span>
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-xs text-tx3">{hint}</div>
        </div>
      </div>
      {children}
    </div>
  );
}
