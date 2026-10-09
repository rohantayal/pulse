import { useMemo } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";
import { ROUTINE_TEMPLATES } from "../data/routineTemplates";
import { PRELOADED_EXERCISES } from "../data/exercises";

/** Tap-to-select list of starter routines. */
export function TemplatePicker({ selected, onToggle }: { selected: string[]; onToggle: (key: string) => void }) {
  const names = useMemo(() => new Map(PRELOADED_EXERCISES.map((e) => [e.id, e.name.replace(/ \(.*\)$/, "")])), []);
  return (
    <div className="space-y-2">
      {ROUTINE_TEMPLATES.map((t) => {
        const on = selected.includes(t.key);
        return (
          <button
            key={t.key}
            onClick={() => onToggle(t.key)}
            aria-pressed={on}
            className={clsx("flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition", on ? "border-acc bg-acc/10" : "border-transparent bg-surf")}
          >
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{t.name}</div>
              <div className="text-sm text-tx2">{t.description}</div>
              <div className="mt-1 truncate text-xs text-tx3">{t.exercises.map(([id]) => names.get(`pre:${id}`)).join(" · ")}</div>
            </div>
            <span className={clsx("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", on ? "border-acc bg-acc text-white" : "border-tx3")}>
              {on && <Check size={14} strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
