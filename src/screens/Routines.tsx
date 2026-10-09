import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ClipboardList, MoreHorizontal, Pencil, Play, Plus, Trash2, X } from "lucide-react";
import { allExercises, useApp } from "../store/app";
import { useUi } from "../store/ui";
import type { Routine, RoutineExercise } from "../types";
import { uid } from "../lib/id";
import { Button, Confirm, Empty, Field, PageHeader, Screen, Sheet, inputCls } from "../components/ui";
import { ExercisePicker } from "./ExercisePicker";
import { useStartWorkout } from "./startWorkout";

export function RoutinesPage() {
  const routines = useApp((s) => s.routines);
  const custom = useApp((s) => s.customExercises);
  const workouts = useApp((s) => s.workouts);
  const push = useUi((s) => s.push);
  const start = useStartWorkout();
  const [menuFor, setMenuFor] = useState<Routine | null>(null);
  const [confirmDel, setConfirmDel] = useState<Routine | null>(null);

  const names = useMemo(() => new Map(allExercises(custom).map((e) => [e.id, e.name])), [custom]);
  const lastDone = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of workouts) if (w.routineId && w.startedAt > (m.get(w.routineId) ?? 0)) m.set(w.routineId, w.startedAt);
    return m;
  }, [workouts]);

  return (
    <div className="flex min-h-full flex-col pb-36">
      <PageHeader
        title="Workout routines"
        right={
          <button onClick={() => push({ kind: "routineEditor" })} className="flex h-10 w-10 items-center justify-center rounded-full text-acc active:bg-surf2" aria-label="New routine">
            <Plus size={24} />
          </button>
        }
      />
      <div className="px-3">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => start()}>
            <Plus size={16} /> Empty workout
          </Button>
          <Button variant="secondary" onClick={() => push({ kind: "routineEditor" })}>
            <ClipboardList size={16} /> New routine
          </Button>
        </div>

        <div className="mb-2 mt-6 px-1 text-[13px] font-semibold uppercase tracking-wider text-tx2">My routines ({routines.length})</div>
        {routines.length === 0 ? (
          <Empty icon={<ClipboardList size={26} />} title="No routines yet" text="Build a routine once and start it with one tap." />
        ) : (
          <div className="space-y-3">
            {routines.map((r) => {
              const last = lastDone.get(r.id);
              return (
                <div key={r.id} className="rounded-2xl bg-surf p-4">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[17px] font-semibold">{r.name}</div>
                      <div className="mt-1 line-clamp-2 text-sm text-tx2">
                        {r.exercises.map((e) => names.get(e.exerciseId) ?? "Unknown").join(", ") || "No exercises"}
                      </div>
                      {last && <div className="mt-1 text-xs text-tx3">Last done {new Date(last).toLocaleDateString()}</div>}
                    </div>
                    <button onClick={() => setMenuFor(r)} className="rounded-full p-1.5 text-tx2 active:bg-surf2" aria-label="Routine options">
                      <MoreHorizontal size={20} />
                    </button>
                  </div>
                  <Button className="mt-3 w-full" onClick={() => start(r)} disabled={r.exercises.length === 0}>
                    <Play size={16} fill="currentColor" /> Start routine
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor?.name}>
        <div className="space-y-2">
          <Button
            variant="secondary"
            className="w-full justify-start"
            onClick={() => {
              if (menuFor) push({ kind: "routineEditor", routineId: menuFor.id });
              setMenuFor(null);
            }}
          >
            <Pencil size={16} /> Edit routine
          </Button>
          <Button
            variant="danger"
            className="w-full justify-start"
            onClick={() => {
              setConfirmDel(menuFor);
              setMenuFor(null);
            }}
          >
            <Trash2 size={16} /> Delete routine
          </Button>
        </div>
      </Sheet>
      <Confirm
        open={!!confirmDel}
        title={`Delete "${confirmDel?.name}"?`}
        message="Your workout history stays."
        confirmLabel="Delete routine"
        destructive
        onCancel={() => setConfirmDel(null)}
        onConfirm={() => {
          if (confirmDel) useApp.getState().deleteRoutine(confirmDel.id);
          setConfirmDel(null);
        }}
      />
    </div>
  );
}

export function RoutineEditor({ routineId }: { routineId?: string }) {
  const { pop, showToast } = useUi();
  const existing = useApp((s) => s.routines.find((r) => r.id === routineId));
  const custom = useApp((s) => s.customExercises);
  const [name, setName] = useState(existing?.name ?? "");
  const [items, setItems] = useState<RoutineExercise[]>(existing?.exercises ?? []);
  const [picking, setPicking] = useState(false);

  const byId = useMemo(() => new Map(allExercises(custom).map((e) => [e.id, e])), [custom]);
  const valid = name.trim() !== "" && items.length > 0;

  const patch = (id: string, p: Partial<RoutineExercise>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) =>
    setItems((xs) => {
      const j = i + d;
      if (j < 0 || j >= xs.length) return xs;
      const c = [...xs];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  function save() {
    if (!valid) return;
    useApp.getState().saveRoutine({ id: existing?.id, name: name.trim(), exercises: items });
    showToast(existing ? "Routine updated" : "Routine saved");
    pop();
  }

  return (
    <Screen>
      <PageHeader
        title={existing ? "Edit routine" : "New routine"}
        onBack={pop}
        right={
          <Button variant="ghost" className="h-9 px-2" disabled={!valid} onClick={save}>
            Save
          </Button>
        }
      />
      <div className="px-3 pb-10">
        <Field label="Routine name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Upper Body A" autoFocus={!existing} />
        </Field>

        <div className="mt-5 space-y-3">
          {items.map((it, i) => {
            const ex = byId.get(it.exerciseId);
            return (
              <div key={it.id} className="rounded-2xl bg-surf p-4">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-acc">{ex?.name ?? "Unknown exercise"}</div>
                    <div className="text-xs text-tx2">{ex ? `${ex.muscle} · ${ex.equipment}` : ""}</div>
                  </div>
                  <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp size={16} />
                  </IconBtn>
                  <IconBtn label="Move down" onClick={() => move(i, 1)} disabled={i === items.length - 1}>
                    <ArrowDown size={16} />
                  </IconBtn>
                  <IconBtn label="Remove" onClick={() => setItems((xs) => xs.filter((x) => x.id !== it.id))}>
                    <X size={16} />
                  </IconBtn>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <div className="mb-1 text-xs text-tx2">Sets</div>
                    <div className="flex h-10 items-center rounded-xl bg-surf2">
                      <button className="h-full w-10 text-lg text-tx2" onClick={() => patch(it.id, { sets: Math.max(1, it.sets - 1) })}>
                        −
                      </button>
                      <div className="flex-1 text-center font-semibold tabular-nums">{it.sets}</div>
                      <button className="h-full w-10 text-lg text-tx2" onClick={() => patch(it.id, { sets: Math.min(20, it.sets + 1) })}>
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-tx2">Rep range</div>
                    <input
                      className={`${inputCls} h-10`}
                      value={it.repRange ?? ""}
                      onChange={(e) => patch(it.id, { repRange: e.target.value || undefined })}
                      placeholder="e.g. 8-12"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button variant="secondary" className="mt-4 w-full" onClick={() => setPicking(true)}>
          <Plus size={16} /> Add exercise
        </Button>
      </div>
      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(ids) => {
            setItems((xs) => [...xs, ...ids.map((exerciseId) => ({ id: uid(), exerciseId, sets: 3 }))]);
            setPicking(false);
          }}
        />
      )}
    </Screen>
  );
}

function IconBtn({ children, onClick, label, disabled }: { children: React.ReactNode; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} className="flex h-8 w-8 items-center justify-center rounded-full bg-surf2 text-tx2 disabled:opacity-30">
      {children}
    </button>
  );
}
