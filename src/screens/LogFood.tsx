import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronDown, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { allFoods, useApp } from "../store/app";
import { useUi } from "../store/ui";
import type { Food, FoodLogEntry, Macros, Meal, NutritionGoals } from "../types";
import { friendlyDate } from "../lib/date";
import { fmt } from "../lib/format";
import { ZERO, add, amountLabel, scale, toServings } from "../lib/nutrition";
import { bestMatch, gramsPerServing, parseFoodText, rankFoods, suggestions, type Unit } from "../lib/foodText";
import { BAR_COLOR, calorieStatus, macroSplit, statusColor, sumEntries } from "../lib/nutrition";
import { dayStats } from "../lib/day";
import { Button, Field, PageHeader, Screen, Sheet, inputCls } from "../components/ui";
import { AddMealSheet } from "../components/AddMealSheet";

/** Per-item choices the user made, keyed by the item's text so they survive edits to other items. */
interface Override {
  foodId?: string;
  qty?: number | null;
  unit?: Unit;
}

interface Item {
  key: string;
  raw: string;
  query: string;
  food: Food | null;
  qty: number | null;
  unit: Unit;
  gps?: number;
  /** null when the amount can't be converted (grams typed but food has no weight) */
  servings: number | null;
  macros: Macros;
  manual: boolean;
  /** Close matches offered when nothing matched fully */
  suggest: Food[];
}


export function LogFood({ meal: initialMeal, date }: { meal: Meal; date: string }) {
  const { pop, push, showToast } = useUi();
  const meals = useApp((s) => s.meals);
  const customFoods = useApp((s) => s.customFoods);
  const recentIds = useApp((s) => s.recentFoodIds);
  const foodLog = useApp((s) => s.foodLog);
  const goals = useApp((s) => s.nutritionGoals);
  const eatenToday = useMemo(() => sumEntries(foodLog.filter((e) => e.date === date)), [foodLog, date]);
  const workouts = useApp((s) => s.workouts);
  const steps = useApp((s) => s.steps);
  const weights = useApp((s) => s.weights);
  const exercise = useMemo(() => dayStats(date, { foodLog: [], workouts, steps, weights }).exercise, [date, workouts, steps, weights]);
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [text, setText] = useState("");
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [changing, setChanging] = useState<Item | null>(null);
  const [addingMeal, setAddingMeal] = useState(false);
  const pendingCreate = useRef<{ key: string; known: Set<string> } | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const foods = useMemo(() => allFoods(customFoods), [customFoods]);
  const byId = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);

  // A food created from "No match → Create food" gets attached to the item that asked for it.
  useEffect(() => {
    const p = pendingCreate.current;
    if (!p) return;
    const created = customFoods.find((f) => !p.known.has(f.id));
    if (created) {
      setOverrides((o) => ({ ...o, [p.key]: { ...o[p.key], foodId: created.id } }));
      pendingCreate.current = null;
    }
  }, [customFoods]);

  const items: Item[] = useMemo(
    () =>
      parseFoodText(text).map((p) => {
        const key = p.raw.toLowerCase();
        const o = overrides[key] ?? {};
        const food = (o.foodId && byId.get(o.foodId)) || bestMatch(p.query, foods, recentIds);
        const unit = o.unit ?? p.unit;
        const qty = o.qty !== undefined ? o.qty : p.qty;
        const gps = food ? gramsPerServing(food) : undefined;
        const servings = qty == null ? null : toServings(qty, unit, gps);
        return {
          key,
          raw: p.raw,
          query: p.query,
          food,
          qty,
          unit,
          gps,
          servings,
          macros: food && servings != null ? scale(food, servings) : ZERO,
          manual: !!o.foodId,
          suggest: food ? [] : suggestions(p.query, foods, recentIds),
        };
      }),
    [text, overrides, foods, byId, recentIds],
  );

  const ready = items.filter((i) => i.food && i.servings != null && i.servings > 0);
  const unmatched = items.filter((i) => !i.food);
  const total = ready.reduce((acc, i) => add(acc, i.macros), ZERO);
  const mealLabel = meals.find((m) => m.id === meal)?.label ?? "meal";

  const setOverride = (key: string, patch: Override) => setOverrides((o) => ({ ...o, [key]: { ...o[key], ...patch } }));

  function removeItem(item: Item) {
    const parts = parseFoodText(text).filter((p) => p.raw.toLowerCase() !== item.key);
    setText(parts.map((p) => p.raw).join(", "));
  }

  /** Quick-add from Recent: append a short name to the text and pin it to that exact food. */
  function appendFood(f: Food) {
    const short = f.name.replace(/\([^)]*\)/g, "").split("/")[0].trim().toLowerCase();
    const raw = `1 ${short}`;
    setOverride(raw, { foodId: f.id });
    setText((t) => (t.trim() ? `${t.trim().replace(/,$/, "")}, ${raw}` : raw));
    textRef.current?.focus();
  }

  function createFor(item: Item) {
    pendingCreate.current = { key: item.key, known: new Set(customFoods.map((f) => f.id)) };
    push({ kind: "foodEditor", name: titleCase(item.query) });
  }

  function save() {
    if (ready.length === 0) return;
    const st = useApp.getState();
    for (const i of ready) {
      st.addFoodEntry(date, meal, i.food!, { servings: i.servings!, grams: i.unit === "g" ? i.qty! : undefined });
    }
    showToast(`Added ${ready.length} item${ready.length > 1 ? "s" : ""} to ${mealLabel}`);
    pop();
  }

  const recent = useMemo(() => recentIds.map((id) => byId.get(id)).filter((f): f is Food => !!f).slice(0, 12), [recentIds, byId]);

  return (
    <Screen>
      <PageHeader title="Log food" subtitle={friendlyDate(date)} onBack={pop} />

      <div className="px-3 pb-52">
        {/* Meal picker */}
        <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
          {meals.map((m) => (
            <button
              key={m.id}
              onClick={() => setMeal(m.id)}
              className={clsx("shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium", meal === m.id ? "bg-acc text-white" : "bg-surf2 text-tx2")}
            >
              {m.label}
            </button>
          ))}
          <button onClick={() => setAddingMeal(true)} className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-line px-3 py-1.5 text-sm font-medium text-tx2">
            <Plus size={14} /> New meal
          </button>
        </div>

        {/* What did you eat? */}
        <div className="rounded-2xl bg-surf p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-tx2">
            <Sparkles size={14} className="text-acc" /> What did you eat?
          </div>
          <textarea
            ref={textRef}
            autoFocus
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"2 roti, 1 bowl dal, 150 g paneer, banana"}
            className="w-full resize-none bg-transparent text-[16px] leading-relaxed text-tx outline-none placeholder:text-tx3"
          />
          <div className="text-[11px] text-tx3">Separate foods with commas or "and". Use g for weight (150g paneer) or a number for servings (2 roti).</div>
        </div>

        {/* Parsed items */}
        {items.length > 0 && (
          <div className="mt-3 space-y-2">
            {items.map((it) => (
              <ItemCard
                key={it.key}
                item={it}
                onChange={() => setChanging(it)}
                onCreate={() => createFor(it)}
                onPick={(f) => setOverride(it.key, { foodId: f.id })}
                onRemove={() => removeItem(it)}
                onAmount={(qty, unit) => setOverride(it.key, { qty, unit })}
              />
            ))}
          </div>
        )}

        {/* Meal total */}
        {ready.length > 0 && <MealTotalCard label={mealLabel} count={ready.length} meal={total} before={eatenToday} goals={goals} exercise={exercise} />}

        {/* Recent foods for one-tap adding */}
        {recent.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wider text-tx2">Recent</div>
            <div className="flex flex-wrap gap-2">
              {recent.map((f) => (
                <button key={f.id} onClick={() => appendFood(f)} className="flex items-center gap-1 rounded-full bg-surf2 px-3 py-1.5 text-sm active:bg-surf3">
                  <Plus size={13} className="text-acc" />
                  {f.name.replace(/\([^)]*\)/g, "").trim()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save bar */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-[31] mx-auto max-w-md bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6">
        {unmatched.length > 0 && ready.length > 0 && (
          <div className="mb-2 text-center text-xs text-gold">
            {unmatched.length} item{unmatched.length > 1 ? "s" : ""} not matched — create {unmatched.length > 1 ? "them" : "it"} or {unmatched.length > 1 ? "they" : "it"}'ll be skipped
          </div>
        )}
        <Button className="mb-4 w-full" disabled={ready.length === 0} onClick={save}>
          {ready.length === 0 ? "Type what you ate" : `Add ${fmt(total.calories)} kcal to ${mealLabel}`}
        </Button>
      </div>

      {changing && (
        <ChangeMatchSheet
          item={changing}
          foods={foods}
          recentIds={recentIds}
          onClose={() => setChanging(null)}
          onPick={(f) => {
            setOverride(changing.key, { foodId: f.id });
            setChanging(null);
          }}
          onCreate={() => {
            const it = changing;
            setChanging(null);
            createFor(it);
          }}
        />
      )}
      <AddMealSheet open={addingMeal} onClose={() => setAddingMeal(false)} onAdded={(m) => setMeal(m.id)} />
    </Screen>
  );
}

function ItemCard({
  item,
  onChange,
  onCreate,
  onPick,
  onRemove,
  onAmount,
}: {
  item: Item;
  onChange: () => void;
  onCreate: () => void;
  onPick: (f: Food) => void;
  onRemove: () => void;
  onAmount: (qty: number | null, unit: Unit) => void;
}) {
  if (!item.food) {
    return (
      <div className="rounded-2xl border border-dashed border-gold/40 bg-surf p-3">
        <div className="flex items-start gap-2">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-gold" />
          <div className="min-w-0 flex-1">
            <div className="text-sm">
              No match for <b>“{item.query}”</b>
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={onCreate} className="flex items-center gap-1 rounded-lg bg-acc px-3 py-1.5 text-xs font-semibold text-white">
                <Plus size={14} /> Create “{titleCase(item.query)}”
              </button>
              <button onClick={onChange} className="flex items-center gap-1 rounded-lg bg-surf2 px-3 py-1.5 text-xs font-semibold">
                <Search size={14} /> Search
              </button>
            </div>
            {item.suggest.length > 0 && (
              <div className="mt-2.5">
                <div className="mb-1 text-[11px] text-tx3">Did you mean</div>
                <div className="flex flex-wrap gap-1.5">
                  {item.suggest.map((f) => (
                    <button key={f.id} onClick={() => onPick(f)} className="rounded-full bg-surf2 px-2.5 py-1 text-xs text-tx2 active:bg-surf3">
                      {f.name} <span className="text-tx3">· {fmt(f.calories)} kcal</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={onRemove} className="rounded-full p-1 text-tx3" aria-label="Remove">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  const f = item.food;
  const gramsUnknown = item.unit === "g" && !item.gps;
  return (
    <div className="rounded-2xl bg-surf p-3">
      <div className="flex items-start gap-2">
        <button onClick={onChange} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1 font-semibold">
            <span className="truncate">{f.name}</span>
            <ChevronDown size={15} className="shrink-0 text-tx3" />
          </div>
          <div className="truncate text-xs text-tx3">
            {item.manual ? "Chosen by you" : `Matched “${item.raw}”`} · {f.serving}
          </div>
        </button>
        <div className="text-right">
          <div className="text-[17px] font-bold tabular-nums">{fmt(item.macros.calories)}</div>
          <div className="text-[10px] text-tx3">kcal</div>
        </div>
        <button onClick={onRemove} className="rounded-full p-1 text-tx3" aria-label="Remove">
          <X size={16} />
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <AmountControl qty={item.qty} unit={item.unit} gps={item.gps} onChange={onAmount} />
        <div className="flex flex-1 justify-end gap-3 text-xs tabular-nums">
          <Mac label="C" value={item.macros.carbs} />
          <Mac label="P" value={item.macros.protein} />
          <Mac label="F" value={item.macros.fat} />
        </div>
      </div>
      {gramsUnknown && (
        <div className="mt-2 text-xs text-gold">This food has no weight per serving — switch to servings, or add its weight in My Foods.</div>
      )}
    </div>
  );
}

/** Number + [servings | g] toggle. Switching unit converts the number so the amount stays the same. */
export function AmountControl({
  qty,
  unit,
  gps,
  onChange,
  large,
}: {
  qty: number | null;
  unit: Unit;
  gps?: number;
  onChange: (qty: number | null, unit: Unit) => void;
  large?: boolean;
}) {
  const switchTo = (u: Unit) => {
    if (u === unit) return;
    if (qty == null || !gps) return onChange(u === "g" ? (gps ?? null) : 1, u);
    onChange(u === "g" ? Math.round(qty * gps) : Math.round((qty / gps) * 100) / 100, u);
  };
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={qty ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Number(e.target.value)), unit)}
        onFocus={(e) => e.target.select()}
        className={clsx("rounded-lg bg-surf2 text-center font-semibold tabular-nums outline-none focus:ring-2 focus:ring-acc", large ? "h-11 w-24 text-lg" : "h-8 w-16 text-sm")}
      />
      <div className={clsx("flex rounded-lg bg-surf2 p-0.5 font-medium", large ? "text-sm" : "text-xs")}>
        {(
          [
            ["serving", "servings"],
            ["g", "g"],
          ] as const
        ).map(([u, label]) => (
          <button
            key={u}
            onClick={() => switchTo(u)}
            disabled={u === "g" && !gps && unit !== "g"}
            className={clsx("rounded-md px-2 disabled:opacity-30", large ? "py-2" : "py-1", unit === u ? "bg-surf3 text-tx" : "text-tx2")}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Mac({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-tx2">{label}</span>
      <b className="font-semibold">{fmt(value, 1)}g</b>
    </span>
  );
}

/**
 * Calories | Carbs | Protein | Fat for the meal being logged.
 * Calories: this meal's share of the daily calorie goal (green/red by how the day ends up).
 * Macros: share of this meal's calories that comes from each macro — they add up to 100%.
 */
function MealTotalCard({
  label,
  count,
  meal,
  before,
  goals,
  exercise,
}: {
  label: string;
  count: number;
  meal: Macros;
  before: Macros;
  goals: NutritionGoals;
  exercise: number;
}) {
  const budget = goals.calories + exercise;
  const after = before.calories + meal.calories;
  const status = calorieStatus(after, budget, goals.overAllowance);
  const kcalPct = budget > 0 ? (meal.calories / budget) * 100 : 0;
  const split = macroSplit(meal);
  const left = budget - after;
  const proteinHit = before.protein < goals.protein && before.protein + meal.protein >= goals.protein;
  const message = proteinHit
    ? { icon: "🎯", text: "This meal hits your protein goal!" }
    : status === "over"
      ? { icon: "⚠️", text: `Puts you ${fmt(-left)} kcal over today's goal` }
      : split.protein >= 30
        ? { icon: "💪", text: `Protein-rich meal — ${Math.round(split.protein)}% of its calories` }
        : { icon: "✨", text: left >= 0 ? `${fmt(left)} kcal left today after this` : `Within your allowance — ${fmt(-left)} kcal over goal` };

  const cols = [
    { label: "Calories", value: meal.calories, unit: "kcal", pct: kcalPct, note: "of day", color: statusColor(status) },
    { label: "Carbs", value: meal.carbs, unit: "g", pct: split.carbs, note: "of meal", color: BAR_COLOR },
    { label: "Protein", value: meal.protein, unit: "g", pct: split.protein, note: "of meal", color: BAR_COLOR },
    { label: "Fat", value: meal.fat, unit: "g", pct: split.fat, note: "of meal", color: BAR_COLOR },
  ];

  return (
    <div className="mt-3 rounded-2xl bg-surf p-4">
      <div className="text-[15px] font-semibold">
        {label} total <span className="text-sm font-normal text-tx2">· {count} item{count > 1 ? "s" : ""}</span>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-3">
        {cols.map((c) => (
          <div key={c.label} className="min-w-0">
            <div className="truncate text-[11px] font-medium text-tx2">{c.label}</div>
            <div className="mt-1 text-[22px] font-bold leading-none tabular-nums" style={c.label === "Calories" ? { color: c.color } : undefined}>
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

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-surf2 px-3 py-2 text-sm">
        <span>{message.icon}</span>
        <span className="text-tx2">{message.text}</span>
      </div>
    </div>
  );
}

function ChangeMatchSheet({
  item,
  foods,
  recentIds,
  onClose,
  onPick,
  onCreate,
}: {
  item: Item;
  foods: Food[];
  recentIds: string[];
  onClose: () => void;
  onPick: (f: Food) => void;
  onCreate: () => void;
}) {
  const [q, setQ] = useState(item.query);
  const results = useMemo(() => rankFoods(q, foods, recentIds).slice(0, 25), [q, foods, recentIds]);
  return (
    <Sheet open onClose={onClose} title={item.food ? "Change food" : `Find “${item.query}”`}>
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx3" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className={clsx(inputCls, "pl-10")} placeholder="Search foods…" />
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl bg-surf2">
        {results.length === 0 && <div className="px-4 py-6 text-center text-sm text-tx2">No foods match “{q}”.</div>}
        {results.map(({ food }) => (
          <FoodRow key={food.id} food={food} onClick={() => onPick(food)} selected={food.id === item.food?.id} />
        ))}
      </div>
      <Button variant="secondary" className="mt-3 w-full" onClick={onCreate}>
        <Plus size={16} /> Create a new food
      </Button>
    </Sheet>
  );
}

export function FoodRow({ food, onClick, right, selected }: { food: Food; onClick: () => void; right?: React.ReactNode; selected?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={clsx("flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0", selected ? "bg-acc/10" : "active:bg-surf3")}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">
          {food.name}
          {food.custom && <span className="ml-1.5 rounded bg-acc/15 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-acc">MINE</span>}
        </div>
        <div className="truncate text-xs text-tx2">
          {food.brand ? `${food.brand} · ` : ""}
          {food.serving} · C {fmt(food.carbs)} · P {fmt(food.protein)} · F {fmt(food.fat)}
        </div>
      </div>
      {right ?? (
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums">{fmt(food.calories)}</div>
          <div className="text-[10px] text-tx3">kcal</div>
        </div>
      )}
    </button>
  );
}

/** Edit a logged entry: amount (servings or grams), meal, or delete. */
export function FoodEntrySheet({ entry, onClose }: { entry: FoodLogEntry; onClose: () => void }) {
  const meals = useApp((s) => s.meals);
  const gps = entry.gramsPerServing ?? gramsPerServing({ serving: entry.serving });
  const [unit, setUnit] = useState<Unit>(entry.grams != null && gps ? "g" : "serving");
  const [qty, setQty] = useState<number | null>(entry.grams != null && gps ? entry.grams : entry.servings);
  const [meal, setMeal] = useState<Meal>(entry.meal);
  const servings = qty == null ? null : toServings(qty, unit, gps);
  const m = scale(entry.per, servings ?? 0);
  const valid = servings != null && servings > 0;

  return (
    <Sheet open onClose={onClose} title={entry.name}>
      <div className="text-sm text-tx2">
        Serving: {entry.serving} · logged as {amountLabel(entry)}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-surf2 p-3 text-center">
        <Cell label="kcal" value={m.calories} />
        <Cell label="Carbs" value={m.carbs} unit="g" />
        <Cell label="Protein" value={m.protein} unit="g" />
        <Cell label="Fat" value={m.fat} unit="g" />
      </div>

      <div className="mt-4">
        <Field label="Amount">
          <AmountControl
            large
            qty={qty}
            unit={unit}
            gps={gps}
            onChange={(q, u) => {
              setQty(q);
              setUnit(u);
            }}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Meal">
          <div className="flex flex-wrap gap-2">
            {meals.map((x) => (
              <button
                key={x.id}
                onClick={() => setMeal(x.id)}
                className={clsx("rounded-lg px-3 py-2 text-sm font-medium", meal === x.id ? "bg-acc text-white" : "bg-surf2 text-tx2")}
              >
                {x.label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-6 flex gap-2">
        <Button
          variant="danger"
          onClick={() => {
            useApp.getState().removeFoodEntry(entry.id);
            onClose();
          }}
        >
          <Trash2 size={16} />
        </Button>
        <Button
          className="flex-1"
          disabled={!valid}
          onClick={() => {
            if (!valid) return;
            useApp.getState().updateFoodEntry(entry.id, { servings: servings!, meal, grams: unit === "g" ? qty! : undefined });
            onClose();
          }}
        >
          Save
        </Button>
      </div>
    </Sheet>
  );
}

function Cell({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div>
      <div className="text-lg font-semibold tabular-nums">
        {fmt(value, unit ? 1 : 0)}
        {unit && <span className="text-xs font-normal text-tx2">{unit}</span>}
      </div>
      <div className="flex items-center justify-center gap-1 text-[11px] text-tx2">
        {label}
      </div>
    </div>
  );
}

function titleCase(s: string) {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}
