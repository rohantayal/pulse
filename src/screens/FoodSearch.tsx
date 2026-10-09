import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import clsx from "clsx";
import { allFoods, useApp } from "../store/app";
import { useUi } from "../store/ui";
import { MEALS, type Food, type FoodLogEntry, type Meal } from "../types";
import { friendlyDate } from "../lib/date";
import { fmt } from "../lib/format";
import { scale } from "../lib/nutrition";
import { Button, Empty, Field, NumberInput, PageHeader, Screen, Sheet, inputCls } from "../components/ui";

export function FoodSearch({ meal: initialMeal, date }: { meal: Meal; date: string }) {
  const { pop, push, showToast } = useUi();
  const customFoods = useApp((s) => s.customFoods);
  const recent = useApp((s) => s.recentFoodIds);
  const [q, setQ] = useState("");
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [tab, setTab] = useState<"all" | "recent" | "mine">(recent.length ? "recent" : "all");
  const [picked, setPicked] = useState<Food | null>(null);

  const foods = useMemo(() => allFoods(customFoods), [customFoods]);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let base: Food[];
    if (needle) base = foods;
    else if (tab === "recent") base = recent.map((id) => foods.find((f) => f.id === id)).filter((f): f is Food => !!f);
    else if (tab === "mine") base = customFoods;
    else base = foods;
    if (!needle) return base;
    const words = needle.split(/\s+/);
    return base
      .filter((f) => {
        const hay = `${f.name} ${f.brand ?? ""} ${f.category ?? ""}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .sort((a, b) => Number(b.name.toLowerCase().startsWith(needle)) - Number(a.name.toLowerCase().startsWith(needle)));
  }, [q, tab, foods, recent, customFoods]);

  return (
    <Screen>
      <PageHeader title="Add food" subtitle={friendlyDate(date)} onBack={pop} />
      <div className="px-3">
        <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
          {MEALS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMeal(m.id)}
              className={clsx("shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium", meal === m.id ? "bg-acc text-white" : "bg-surf2 text-tx2")}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx3" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search foods…" className={clsx(inputCls, "pl-10")} />
        </div>
        {!q && (
          <div className="mt-3 grid grid-cols-3 rounded-xl bg-surf2 p-1 text-sm">
            {(
              [
                ["recent", "Recent"],
                ["all", "All foods"],
                ["mine", "My foods"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={clsx("rounded-lg py-1.5 font-medium", tab === id ? "bg-surf3 text-tx" : "text-tx2")}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 flex-1 px-3 pb-8">
        {list.length === 0 ? (
          <Empty
            icon={<Search size={26} />}
            title={q ? "No matches" : tab === "recent" ? "Nothing logged yet" : "No custom foods yet"}
            text={q ? "Create it as your own food." : undefined}
            action={
              <Button variant="secondary" onClick={() => push({ kind: "foodEditor" })}>
                <Plus size={16} /> Create food
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-surf">
            {list.map((f) => (
              <FoodRow key={f.id} food={f} onClick={() => setPicked(f)} />
            ))}
          </div>
        )}
        {list.length > 0 && (
          <Button variant="ghost" className="mx-auto mt-3" onClick={() => push({ kind: "foodEditor" })}>
            <Plus size={16} /> Create a custom food
          </Button>
        )}
      </div>

      {picked && (
        <FoodEntrySheet
          food={picked}
          meal={meal}
          onClose={() => setPicked(null)}
          onAdd={(servings, m) => {
            useApp.getState().addFoodEntry(date, m, picked, servings);
            setPicked(null);
            showToast(`Added ${picked.name}`);
          }}
        />
      )}
    </Screen>
  );
}

export function FoodRow({ food, onClick, right }: { food: Food; onClick: () => void; right?: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0 active:bg-surf2">
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

const QUICK = [0.5, 1, 1.5, 2];

/** Add a food (when `food` is given) or edit an existing log entry (when `entry` is given). */
export function FoodEntrySheet(
  props:
    | { food: Food; meal: Meal; onClose: () => void; onAdd: (servings: number, meal: Meal) => void; entry?: undefined }
    | { entry: FoodLogEntry; onClose: () => void; food?: undefined },
) {
  const { onClose } = props;
  const base = props.entry ? { ...props.entry.per, name: props.entry.name, serving: props.entry.serving } : props.food;
  const [servings, setServings] = useState<number | null>(props.entry ? props.entry.servings : 1);
  const [meal, setMeal] = useState<Meal>(props.entry ? props.entry.meal : props.meal);
  const m = scale(base, servings ?? 0);
  const valid = servings != null && servings > 0;

  return (
    <Sheet open onClose={onClose} title={base.name}>
      <div className="text-sm text-tx2">Serving: {base.serving}</div>

      <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-surf2 p-3 text-center">
        <MacroCell label="kcal" value={m.calories} />
        <MacroCell label="Carbs" value={m.carbs} unit="g" color="#199e70" />
        <MacroCell label="Protein" value={m.protein} unit="g" color="#3987e5" />
        <MacroCell label="Fat" value={m.fat} unit="g" color="#d95926" />
      </div>

      <div className="mt-4">
        <Field label="Number of servings">
          <NumberInput value={servings} onChange={setServings} />
        </Field>
        <div className="mt-2 flex gap-2">
          {QUICK.map((qv) => (
            <button
              key={qv}
              onClick={() => setServings(qv)}
              className={clsx("flex-1 rounded-lg py-1.5 text-sm font-medium", servings === qv ? "bg-acc text-white" : "bg-surf2 text-tx2")}
            >
              {qv}×
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <Field label="Meal">
          <div className="grid grid-cols-4 gap-2">
            {MEALS.map((x) => (
              <button
                key={x.id}
                onClick={() => setMeal(x.id)}
                className={clsx("rounded-lg py-2 text-sm font-medium", meal === x.id ? "bg-acc text-white" : "bg-surf2 text-tx2")}
              >
                {x.label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-6 flex gap-2">
        {props.entry && (
          <Button
            variant="danger"
            onClick={() => {
              useApp.getState().removeFoodEntry(props.entry.id);
              onClose();
            }}
          >
            <Trash2 size={16} />
          </Button>
        )}
        <Button
          className="flex-1"
          disabled={!valid}
          onClick={() => {
            if (!valid) return;
            if (props.entry) {
              useApp.getState().updateFoodEntry(props.entry.id, { servings, meal });
              onClose();
            } else props.onAdd(servings, meal);
          }}
        >
          {props.entry ? "Save" : "Add to diary"}
        </Button>
      </div>
    </Sheet>
  );
}

function MacroCell({ label, value, unit, color }: { label: string; value: number; unit?: string; color?: string }) {
  return (
    <div>
      <div className="text-lg font-semibold tabular-nums">
        {fmt(value, unit ? 1 : 0)}
        {unit && <span className="text-xs font-normal text-tx2">{unit}</span>}
      </div>
      <div className="flex items-center justify-center gap-1 text-[11px] text-tx2">
        {color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
        {label}
      </div>
    </div>
  );
}
