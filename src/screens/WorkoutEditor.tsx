import { useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { allExercises, useApp } from "../store/app";
import { useUi } from "../store/ui";
import type { Workout, WorkoutExercise } from "../types";
import { uid } from "../lib/id";
import { fromUnit, toUnit } from "../lib/units";
import { Button, Confirm, Empty, Field, NumberInput, PageHeader, Screen, inputCls } from "../components/ui";
import { ExercisePicker } from "./ExercisePicker";

/** Fix a finished workout: name, duration, calories, notes, and every exercise and set. */
export function WorkoutEditor({ workoutId }: { workoutId: string }) {
  const original = useApp((s) => s.workouts.find((w) => w.id === workoutId));
  const custom = useApp((s) => s.customExercises);
  const unit = useApp((s) => s.unit);
  const { pop, showToast } = useUi();
  const [draft, setDraft] = useState<Workout | undefined>(original);
  const [minutes, setMinutes] = useState<number | null>(original ? Math.max(1, Math.round((original.endedAt - original.startedAt) / 60000)) : null);
  const [picking, setPicking] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const byId = useMemo(() => new Map(allExercises(custom).map((e) => [e.id, e])), [custom]);

  if (!draft || !original) {
    return (
      <Screen>
        <PageHeader title="Edit workout" onBack={pop} />
        <Empty icon={<X size={26} />} title="Workout not found" />
      </Screen>
    );
  }

  const setEx = (exId: string, fn: (e: WorkoutExercise) => WorkoutExercise) =>
    setDraft((d) => d && { ...d, exercises: d.exercises.map((e) => (e.id === exId ? fn(e) : e)) });

  const cleaned = draft.exercises
    .map((e) => ({ ...e, sets: e.sets.filter((s) => s.reps != null && s.reps > 0).map((s) => ({ ...s, done: true })) }))
    .filter((e) => e.sets.length > 0);
  const valid = draft.name.trim() !== "" && cleaned.length > 0 && minutes != null && minutes > 0;
  const dirty = JSON.stringify(draft) !== JSON.stringify(original) || minutes !== Math.max(1, Math.round((original.endedAt - original.startedAt) / 60000));

  function save() {
    if (!valid || !draft) return;
    useApp.getState().updateWorkout({
      ...draft,
      name: draft.name.trim(),
      endedAt: draft.startedAt + minutes! * 60000,
      exercises: cleaned,
      notes: draft.notes?.trim() || undefined,
    });
    showToast("Workout updated");
    pop();
  }

  return (
    <Screen>
      <PageHeader
        title="Edit workout"
        onBack={() => (dirty ? setConfirmLeave(true) : pop())}
        right={
          <Button variant="ghost" className="h-9 px-2" disabled={!valid} onClick={save}>
            Save
          </Button>
        }
      />
      <div className="space-y-4 px-3 pb-12">
        <div className="space-y-3 rounded-2xl bg-surf p-4">
          <Field label="Name">
            <input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration">
              <NumberInput value={minutes} onChange={(v) => setMinutes(v == null ? null : Math.round(v))} suffix="min" step="1" />
            </Field>
            <Field label="Calories burned">
              <NumberInput value={draft.caloriesBurned} onChange={(v) => setDraft({ ...draft, caloriesBurned: Math.max(0, Math.round(v ?? 0)) })} suffix="kcal" step="1" />
            </Field>
          </div>
          <Field label="Notes">
            <textarea className={`${inputCls} h-16 py-2`} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </Field>
        </div>

        {draft.exercises.map((e) => (
          <div key={e.id} className="rounded-2xl bg-surf p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="min-w-0 flex-1 truncate font-semibold text-acc">{byId.get(e.exerciseId)?.name ?? "Unknown exercise"}</div>
              <button
                onClick={() => setDraft({ ...draft, exercises: draft.exercises.filter((x) => x.id !== e.id) })}
                className="rounded-full p-1.5 text-tx3 active:bg-surf2"
                aria-label="Remove exercise"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-tx3">
              <div>Set</div>
              <div className="text-center">{unit}</div>
              <div className="text-center">Reps</div>
              <div />
            </div>
            {e.sets.map((s, i) => (
              <div key={s.id} className="mt-1 grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 px-1">
                <div className="text-sm font-semibold text-tx2">{i + 1}</div>
                <NumberInput
                  value={s.kg == null ? null : toUnit(s.kg, unit)}
                  onChange={(v) => setEx(e.id, (x) => ({ ...x, sets: x.sets.map((y) => (y.id === s.id ? { ...y, kg: v == null ? null : fromUnit(v, unit) } : y)) }))}
                  className="h-9 text-center"
                />
                <NumberInput
                  value={s.reps}
                  step="1"
                  onChange={(v) => setEx(e.id, (x) => ({ ...x, sets: x.sets.map((y) => (y.id === s.id ? { ...y, reps: v == null ? null : Math.round(v) } : y)) }))}
                  className="h-9 text-center"
                />
                <button onClick={() => setEx(e.id, (x) => ({ ...x, sets: x.sets.filter((y) => y.id !== s.id) }))} className="text-tx3" aria-label="Delete set">
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                setEx(e.id, (x) => {
                  const last = x.sets[x.sets.length - 1];
                  return { ...x, sets: [...x.sets, { id: uid(), kg: last?.kg ?? null, reps: last?.reps ?? null, done: true }] };
                })
              }
              className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-surf2 text-sm font-semibold"
            >
              <Plus size={16} /> Add set
            </button>
          </div>
        ))}

        <Button variant="secondary" className="w-full" onClick={() => setPicking(true)}>
          <Plus size={16} /> Add exercise
        </Button>
        <p className="text-center text-xs text-tx3">Sets without reps are removed when you save. Records are recalculated across your history.</p>
      </div>

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(ids) => {
            setDraft({ ...draft, exercises: [...draft.exercises, ...ids.map((exerciseId) => ({ id: uid(), exerciseId, sets: [{ id: uid(), kg: null, reps: null, done: true }] }))] });
            setPicking(false);
          }}
        />
      )}
      <Confirm
        open={confirmLeave}
        title="Discard changes?"
        confirmLabel="Discard"
        destructive
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false);
          pop();
        }}
      />
    </Screen>
  );
}
