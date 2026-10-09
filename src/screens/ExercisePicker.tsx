import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import clsx from "clsx";
import { allExercises, useApp } from "../store/app";
import { EQUIPMENT, MUSCLES } from "../data/exercises";
import { Button, Field, PageHeader, Screen, Sheet, inputCls } from "../components/ui";
import { ExerciseThumb } from "../components/ExerciseThumb";
import { InfoButton } from "../components/InfoButton";
import { ExerciseProgress } from "./ExerciseProgress";
import { primaryLabel } from "../lib/muscles";

/** Full-screen exercise chooser. `multi` lets you tick several and add them in one go. */
export function ExercisePicker({
  onClose,
  onPick,
  multi = true,
  title = "Add exercises",
}: {
  onClose: () => void;
  onPick: (ids: string[]) => void;
  multi?: boolean;
  title?: string;
}) {
  const custom = useApp((s) => s.customExercises);
  const workouts = useApp((s) => s.workouts);
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [infoFor, setInfoFor] = useState<string | null>(null);

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of workouts) for (const e of w.exercises) m.set(e.exerciseId, (m.get(e.exerciseId) ?? 0) + 1);
    return m;
  }, [workouts]);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return allExercises(custom)
      .filter((e) => (!muscle || e.muscle === muscle) && (!n || `${e.name} ${e.muscle} ${e.equipment}`.toLowerCase().includes(n)))
      .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.name.localeCompare(b.name));
  }, [q, muscle, custom, usage]);

  const toggle = (id: string) => {
    if (!multi) {
      onPick([id]);
      return;
    }
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  return (
    <Screen className="z-[45]">
      <PageHeader
        title={title}
        onBack={onClose}
        right={
          <button onClick={() => setCreating(true)} className="rounded-full px-2 py-1 text-sm font-semibold text-acc active:bg-surf2">
            Create
          </button>
        }
      />
      <div className="px-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx3" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercise" className={clsx(inputCls, "pl-10")} />
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          <Chip active={!muscle} onClick={() => setMuscle(null)}>
            All
          </Chip>
          {MUSCLES.map((m) => (
            <Chip key={m} active={muscle === m} onClick={() => setMuscle(m === muscle ? null : m)}>
              {m}
            </Chip>
          ))}
        </div>
      </div>
      <div className="mt-2 flex-1 px-3 pb-28">
        <div className="overflow-hidden rounded-2xl bg-surf">
          {list.map((e) => {
            const on = sel.includes(e.id);
            return (
              <div
                key={e.id}
                role="button"
                tabIndex={0}
                onClick={() => toggle(e.id)}
                onKeyDown={(k) => (k.key === "Enter" || k.key === " ") && toggle(e.id)}
                className={clsx("flex w-full cursor-pointer items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0", on ? "bg-acc/10" : "active:bg-surf2")}
              >
                <div className="relative">
                  <ExerciseThumb exercise={e} />
                  {on && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-acc text-white">
                      <Check size={13} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{e.name}</div>
                  <div className="truncate text-xs text-tx2">
                    {primaryLabel(e)} · {e.equipment}
                    {usage.get(e.id) ? ` · done ${usage.get(e.id)}×` : ""}
                  </div>
                </div>
                <InfoButton onClick={() => setInfoFor(e.id)} />
              </div>
            );
          })}
        </div>
      </div>
      {multi && sel.length > 0 && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-[46] mx-auto max-w-md bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6">
          <Button className="mb-4 w-full" onClick={() => onPick(sel)}>
            Add {sel.length} exercise{sel.length > 1 ? "s" : ""}
          </Button>
        </div>
      )}
      {infoFor && <ExerciseProgress exerciseId={infoFor} overlay onClose={() => setInfoFor(null)} />}
      <CreateExerciseSheet
        open={creating}
        initialName={q}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setCreating(false);
          if (multi) setSel((s) => [...s, id]);
          else onPick([id]);
        }}
      />
    </Screen>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={clsx("shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium", active ? "bg-acc text-white" : "bg-surf2 text-tx2")}>
      {children}
    </button>
  );
}

function CreateExerciseSheet({
  open,
  initialName,
  onClose,
  onCreated,
}: {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState("Chest");
  const [equipment, setEquipment] = useState("Barbell");
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setName(initialName);
  }
  return (
    <Sheet open={open} onClose={onClose} title="Create exercise" z="z-[60]">
      <div className="space-y-4">
        <Field label="Name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cable Y-Raise" />
        </Field>
        <Field label="Primary muscle">
          <div className="flex flex-wrap gap-2">
            {MUSCLES.map((m) => (
              <Chip key={m} active={muscle === m} onClick={() => setMuscle(m)}>
                {m}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Equipment">
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((m) => (
              <Chip key={m} active={equipment === m} onClick={() => setEquipment(m)}>
                {m}
              </Chip>
            ))}
          </div>
        </Field>
        <Button
          className="w-full"
          disabled={!name.trim()}
          onClick={() => {
            const ex = useApp.getState().saveCustomExercise({ name: name.trim(), muscle, equipment });
            onCreated(ex.id);
          }}
        >
          <Plus size={16} /> Create
        </Button>
      </div>
    </Sheet>
  );
}
