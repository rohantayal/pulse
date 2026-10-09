import { useMemo, useState } from "react";
import { Apple, ChevronRight, Plus, Search } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store/app";
import { useUi } from "../store/ui";
import { PRELOADED_FOODS } from "../data/foods";
import type { Food } from "../types";
import { macroCalories } from "../lib/nutrition";
import { fmt } from "../lib/format";
import { Button, Confirm, Empty, Field, PageHeader, Screen, inputCls } from "../components/ui";
import { FoodRow } from "./LogFood";
import { gramsPerServing } from "../lib/foodText";

export function MyFoods() {
  const custom = useApp((s) => s.customFoods);
  const push = useUi((s) => s.push);
  const [view, setView] = useState<"mine" | "library">("mine");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const base = view === "mine" ? custom : PRELOADED_FOODS;
    const n = q.trim().toLowerCase();
    return n ? base.filter((f) => `${f.name} ${f.brand ?? ""} ${f.category ?? ""}`.toLowerCase().includes(n)) : base;
  }, [view, custom, q]);

  return (
    <div className="flex min-h-full flex-col pb-36">
      <PageHeader
        title="My Foods"
        right={
          <button onClick={() => push({ kind: "foodEditor" })} className="flex h-10 w-10 items-center justify-center rounded-full text-acc active:bg-surf2" aria-label="New food">
            <Plus size={24} />
          </button>
        }
      />
      <div className="px-3">
        <div className="grid grid-cols-2 rounded-xl bg-surf2 p-1 text-sm">
          {(
            [
              ["mine", `Custom (${custom.length})`],
              ["library", `Food library (${PRELOADED_FOODS.length})`],
            ] as const
          ).map(([id, label]) => (
            <button key={id} onClick={() => setView(id)} className={clsx("rounded-lg py-1.5 font-medium", view === id ? "bg-surf3 text-tx" : "text-tx2")}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative mt-3">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className={clsx(inputCls, "pl-10")} />
        </div>
      </div>
      <div className="mt-3 px-3">
        {list.length === 0 ? (
          view === "mine" && !q ? (
            <Empty
              icon={<Apple size={28} />}
              title="No custom foods yet"
              text="Add the foods you eat often — home recipes, packaged items, anything with a label."
              action={
                <Button onClick={() => push({ kind: "foodEditor" })}>
                  <Plus size={16} /> Create food
                </Button>
              }
            />
          ) : (
            <Empty icon={<Search size={26} />} title="No matches" />
          )
        ) : (
          <div className="overflow-hidden rounded-2xl bg-surf">
            {list.map((f) => (
              <FoodRow
                key={f.id}
                food={f}
                onClick={() => (f.custom ? push({ kind: "foodEditor", foodId: f.id }) : undefined)}
                right={
                  <div className="flex items-center gap-1">
                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums">{fmt(f.calories)}</div>
                      <div className="text-[10px] text-tx3">kcal</div>
                    </div>
                    {f.custom && <ChevronRight size={18} className="text-tx3" />}
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const blank: Omit<Food, "id"> = { name: "", brand: "", serving: "1 serving", calories: 0, carbs: 0, protein: 0, fat: 0 };

export function FoodEditor({ foodId, name }: { foodId?: string; name?: string }) {
  const { pop, showToast } = useUi();
  const existing = useApp((s) => s.customFoods.find((f) => f.id === foodId));
  const [f, setF] = useState<Omit<Food, "id">>(existing ?? { ...blank, name: name ?? "" });
  const parsedGrams = gramsPerServing({ serving: f.serving });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof Food>(k: K, v: Food[K]) => setF((x) => ({ ...x, [k]: v }));
  const fromMacros = Math.round(macroCalories(f));
  const valid = f.name.trim() !== "" && f.serving.trim() !== "" && f.calories >= 0;

  function save() {
    if (!valid) return;
    useApp.getState().saveCustomFood({ ...f, name: f.name.trim(), brand: f.brand?.trim() || undefined, id: existing?.id });
    showToast(existing ? "Food updated" : "Food created");
    pop();
  }

  return (
    <Screen>
      <PageHeader
        title={existing ? "Edit food" : "New food"}
        onBack={pop}
        right={
          <Button variant="ghost" disabled={!valid} onClick={save} className="h-9 px-2">
            Save
          </Button>
        }
      />
      <div className="space-y-4 px-4 pb-10">
        <Field label="Name">
          <input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Mom's Poha" autoFocus={!name} />
        </Field>
        <Field label="Brand (optional)">
          <input className={inputCls} value={f.brand ?? ""} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Amul" />
        </Field>
        <div className="grid grid-cols-[1fr_7.5rem] gap-3">
          <Field label="Serving size">
            <input className={inputCls} value={f.serving} onChange={(e) => set("serving", e.target.value)} placeholder="e.g. 1 bowl" autoFocus={!!name} />
          </Field>
          <Field label="Weight (g)">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              className={inputCls}
              value={f.grams ?? ""}
              placeholder={parsedGrams ? String(parsedGrams) : "optional"}
              onChange={(e) => set("grams", e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)))}
            />
          </Field>
        </div>
        <p className="-mt-2 text-xs text-tx3">Add the weight of one serving so you can also log this food in grams.</p>

        <div className="rounded-2xl bg-surf p-4">
          <div className="mb-3 text-sm font-semibold">Nutrition per serving</div>
          <div className="grid grid-cols-2 gap-3">
            <MacroInput label="Calories" unit="kcal" value={f.calories} onChange={(v) => set("calories", v)} />
            <MacroInput label="Carbs" unit="g" value={f.carbs} onChange={(v) => set("carbs", v)} />
            <MacroInput label="Protein" unit="g" value={f.protein} onChange={(v) => set("protein", v)} />
            <MacroInput label="Fat" unit="g" value={f.fat} onChange={(v) => set("fat", v)} />
          </div>
          {fromMacros > 0 && Math.abs(fromMacros - f.calories) > Math.max(15, f.calories * 0.15) && (
            <button onClick={() => set("calories", fromMacros)} className="mt-3 w-full rounded-lg bg-surf2 px-3 py-2 text-left text-xs text-tx2">
              Macros add up to ≈ <b className="text-tx">{fromMacros} kcal</b>. Tap to use that.
            </button>
          )}
        </div>

        <Button className="w-full" disabled={!valid} onClick={save}>
          {existing ? "Save changes" : "Create food"}
        </Button>
        {existing && (
          <Button variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}>
            Delete food
          </Button>
        )}
      </div>
      <Confirm
        open={confirmDelete}
        title="Delete this food?"
        message="Entries already in your diary will keep their values."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (existing) useApp.getState().deleteCustomFood(existing.id);
          pop();
        }}
      />
    </Screen>
  );
}

function MacroInput({ label, unit, value, onChange, dot }: { label: string; unit: string; value: number; onChange: (v: number) => void; dot?: string }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-xs text-tx2">
        {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
        {label}
      </span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={Number.isFinite(value) && value !== 0 ? value : ""}
          placeholder="0"
          onChange={(e) => onChange(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
          className={clsx(inputCls, "pr-12")}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-tx3">{unit}</span>
      </div>
    </label>
  );
}
