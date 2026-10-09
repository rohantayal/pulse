import { useMemo, useState } from "react";
import { ChevronRight, ClipboardList, Clock, Dumbbell, Flame, MoreHorizontal, Pencil, Trash2, Trophy } from "lucide-react";
import { allExercises, useApp, useUnit } from "../store/app";
import { useUi } from "../store/ui";
import type { Workout } from "../types";
import { formatDuration, longDate, fromKey } from "../lib/date";
import { fmt } from "../lib/format";
import { completedSets, exercisesVolume, formatSet, oneRepMax } from "../lib/workout";
import { Button, Confirm, Empty, PageHeader, Screen, Sheet } from "../components/ui";
import { useStartWorkout } from "./startWorkout";
import { ExerciseThumb } from "../components/ExerciseThumb";
import { primaryLabel } from "../lib/muscles";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function prCount(w: Workout) {
  return w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.pr?.length).length, 0);
}

export function HistoryPage() {
  const { unit, show } = useUnit();
  const workouts = useApp((s) => s.workouts);
  const custom = useApp((s) => s.customExercises);
  const push = useUi((s) => s.push);
  const start = useStartWorkout();
  const names = useMemo(() => new Map(allExercises(custom).map((e) => [e.id, e.name])), [custom]);

  const groups = useMemo(() => {
    const sorted = [...workouts].sort((a, b) => b.startedAt - a.startedAt);
    const out: { label: string; items: Workout[] }[] = [];
    for (const w of sorted) {
      const d = fromKey(w.date);
      const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      if (out[out.length - 1]?.label !== label) out.push({ label, items: [] });
      out[out.length - 1].items.push(w);
    }
    return out;
  }, [workouts]);

  return (
    <div className="flex min-h-full flex-col pb-36">
      <PageHeader title="Previous workouts" subtitle={workouts.length ? `${workouts.length} workout${workouts.length > 1 ? "s" : ""} logged` : undefined} />
      {workouts.length === 0 ? (
        <Empty
          icon={<Dumbbell size={28} />}
          title="No workouts yet"
          text="Finished workouts show up here with every set you hit."
          action={<Button onClick={() => start()}>Start empty workout</Button>}
        />
      ) : (
        <div className="px-3">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="mb-2 mt-4 px-1 text-[13px] font-semibold uppercase tracking-wider text-tx2">{g.label}</div>
              <div className="space-y-3">
                {g.items.map((w) => {
                  const prs = prCount(w);
                  return (
                    <button key={w.id} onClick={() => push({ kind: "workoutDetail", workoutId: w.id })} className="w-full rounded-2xl bg-surf p-4 text-left active:bg-surf2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[16px] font-semibold">{w.name}</div>
                          <div className="text-xs text-tx2">{longDate(w.date)}</div>
                        </div>
                        {prs > 0 && (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">
                            <Trophy size={12} fill="#f5c542" /> {prs} PR{prs > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex gap-5 text-sm">
                        <span className="flex items-center gap-1.5 text-tx2">
                          <Clock size={14} /> {formatDuration(w.endedAt - w.startedAt)}
                        </span>
                        <span className="text-tx2">
                          {fmt(show(exercisesVolume(w.exercises)))} {unit}
                        </span>
                        <span className="text-tx2">
                          {completedSets(w.exercises)} set{completedSets(w.exercises) === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1 border-t border-line pt-3">
                        {w.exercises.slice(0, 4).map((e) => (
                          <div key={e.id} className="flex justify-between gap-2 text-sm">
                            <span className="truncate">
                              {e.sets.length} × {names.get(e.exerciseId) ?? "Unknown"}
                            </span>
                            <span className="shrink-0 text-tx2">{formatSet(bestSet(e.sets), unit)}</span>
                          </div>
                        ))}
                        {w.exercises.length > 4 && <div className="text-xs text-tx3">+{w.exercises.length - 4} more</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function bestSet(sets: Workout["exercises"][number]["sets"]) {
  return sets.reduce((best, s) => (oneRepMax(s.kg ?? 0, s.reps ?? 0) > oneRepMax(best.kg ?? 0, best.reps ?? 0) || (best.reps ?? 0) === 0 ? s : best), sets[0]);
}

export function WorkoutDetail({ workoutId }: { workoutId: string }) {
  const { unit, show } = useUnit();
  const w = useApp((s) => s.workouts.find((x) => x.id === workoutId));
  const custom = useApp((s) => s.customExercises);
  const { pop, push, showToast } = useUi();
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const byId = useMemo(() => new Map(allExercises(custom).map((e) => [e.id, e])), [custom]);

  if (!w) {
    return (
      <Screen>
        <PageHeader title="Workout" onBack={pop} />
        <Empty icon={<Dumbbell size={26} />} title="Workout not found" />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader
        title={w.name}
        subtitle={longDate(w.date)}
        onBack={pop}
        right={
          <button onClick={() => setMenu(true)} className="flex h-10 w-10 items-center justify-center rounded-full active:bg-surf2" aria-label="Workout options">
            <MoreHorizontal size={20} />
          </button>
        }
      />
      <div className="px-3 pb-10">
        <div className="grid grid-cols-4 gap-2 rounded-2xl bg-surf p-4 text-center">
          <DStat icon={<Clock size={14} />} label="Duration" value={formatDuration(w.endedAt - w.startedAt)} />
          <DStat label="Volume" value={`${fmt(show(exercisesVolume(w.exercises)))} ${unit}`} />
          <DStat label="Sets" value={String(completedSets(w.exercises))} />
          <DStat icon={<Flame size={14} />} label="kcal" value={String(w.caloriesBurned)} />
        </div>
        {w.notes && <div className="mt-3 rounded-2xl bg-surf p-4 text-sm text-tx2">{w.notes}</div>}

        {w.exercises.map((e) => {
          const ex = byId.get(e.exerciseId);
          return (
            <div key={e.id} className="mt-3 rounded-2xl bg-surf p-4">
              <button onClick={() => push({ kind: "exerciseProgress", exerciseId: e.exerciseId })} className="flex w-full items-center gap-3 text-left">
                <ExerciseThumb exercise={ex} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 font-semibold text-acc">
                    <span className="truncate">{ex?.name ?? "Unknown exercise"}</span>
                    <ChevronRight size={16} className="shrink-0" />
                  </div>
                  {ex && <div className="text-xs text-tx3">{primaryLabel(ex)}</div>}
                </div>
              </button>
              <div className="mt-2 grid grid-cols-[2.5rem_1fr_auto] gap-y-1 text-[11px] font-semibold uppercase tracking-wide text-tx3">
                <div>Set</div>
                <div>Weight & reps</div>
                <div className="text-right">1RM</div>
              </div>
              {e.sets.map((s, i) => (
                <div key={s.id} className="grid grid-cols-[2.5rem_1fr_auto] items-center py-1 text-sm">
                  <div className="font-semibold text-tx2">{s.pr?.length ? <Trophy size={15} className="text-gold" fill="#f5c542" /> : i + 1}</div>
                  <div className="font-medium">{formatSet(s, unit)}</div>
                  <div className="text-right text-tx2">{s.kg ? `${fmt(show(oneRepMax(s.kg, s.reps ?? 0)), 1)} ${unit}` : "–"}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)} title={w.name}>
        <div className="space-y-2">
          <Button
            variant="secondary"
            className="w-full justify-start"
            onClick={() => {
              setMenu(false);
              push({ kind: "workoutEditor", workoutId: w.id });
            }}
          >
            <Pencil size={16} /> Edit workout
          </Button>
          <Button
            variant="secondary"
            className="w-full justify-start"
            onClick={() => {
              useApp.getState().saveWorkoutAsRoutine(w.id);
              setMenu(false);
              showToast("Saved as routine");
            }}
          >
            <ClipboardList size={16} /> Save as routine
          </Button>
          <Button
            variant="danger"
            className="w-full justify-start"
            onClick={() => {
              setMenu(false);
              setConfirm(true);
            }}
          >
            <Trash2 size={16} /> Delete workout
          </Button>
        </div>
      </Sheet>
      <Confirm
        open={confirm}
        title="Delete workout?"
        message="This removes it from your history and PR records."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          useApp.getState().deleteWorkout(w.id);
          pop();
        }}
      />
    </Screen>
  );
}

function DStat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[15px] font-semibold tabular-nums">{value}</div>
      <div className="flex items-center justify-center gap-1 text-[11px] text-tx2">
        {icon}
        {label}
      </div>
    </div>
  );
}
