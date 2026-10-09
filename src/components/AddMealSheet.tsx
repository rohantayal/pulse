import { useState } from "react";
import { useApp } from "../store/app";
import type { MealDef } from "../types";
import { Button, Sheet, inputCls } from "./ui";

const SUGGESTIONS = ["Pre-workout", "Post-workout", "Evening snack", "Late night"];

export function AddMealSheet({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded?: (m: MealDef) => void }) {
  const meals = useApp((s) => s.meals);
  const [name, setName] = useState("");
  const taken = meals.some((m) => m.label.toLowerCase() === name.trim().toLowerCase());
  const valid = name.trim() !== "" && !taken;

  function add(label = name) {
    if (!label.trim() || meals.some((m) => m.label.toLowerCase() === label.trim().toLowerCase())) return;
    const m = useApp.getState().addMeal(label);
    setName("");
    onAdded?.(m);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="New meal" z="z-[60]">
      <input
        autoFocus
        className={inputCls}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && valid && add()}
        placeholder="e.g. Pre-workout"
      />
      {taken && <div className="mt-1 text-xs text-gold">You already have a meal with that name.</div>}
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.filter((s) => !meals.some((m) => m.label === s)).map((s) => (
          <button key={s} onClick={() => add(s)} className="rounded-full bg-surf2 px-3 py-1.5 text-sm text-tx2 active:bg-surf3">
            + {s}
          </button>
        ))}
      </div>
      <Button className="mt-4 w-full" disabled={!valid} onClick={() => add()}>
        Add meal
      </Button>
    </Sheet>
  );
}
