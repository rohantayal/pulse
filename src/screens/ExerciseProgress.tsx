import { useMemo, useState } from "react";
import { Dumbbell, Trophy } from "lucide-react";
import clsx from "clsx";
import { allExercises, useApp, useUnit } from "../store/app";
import { useUi } from "../store/ui";
import { dayNum, longDate, monthShort } from "../lib/date";
import { fmt } from "../lib/format";
import { formatSet, isCountable, oneRepMax } from "../lib/workout";
import { Card, Empty, PageHeader, Screen, SectionTitle } from "../components/ui";
import { LineChart } from "../components/Charts";
import type { WorkoutSet } from "../types";

type Metric = "oneRm" | "weight" | "volume" | "reps";

interface Session {
  workoutId: string;
  date: string;
  startedAt: number;
  sets: WorkoutSet[];
  oneRm: number;
  weight: number;
  volume: number;
  reps: number;
}

/** One exercise over time: records, a trend chart and every session's sets. */
export function ExerciseProgress({ exerciseId }: { exerciseId: string }) {
  const workouts = useApp((s) => s.workouts);
  const custom = useApp((s) => s.customExercises);
  const { unit, show } = useUnit();
  const { pop, push } = useUi();
  const exercise = useMemo(() => allExercises(custom).find((e) => e.id === exerciseId), [custom, exerciseId]);

  const sessions: Session[] = useMemo(() => {
    const out: Session[] = [];
    for (const w of workouts) {
      const sets = w.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets.filter(isCountable));
      if (sets.length === 0) continue;
      out.push({
        workoutId: w.id,
        date: w.date,
        startedAt: w.startedAt,
        sets,
        oneRm: Math.max(...sets.map((s) => oneRepMax(s.kg ?? 0, s.reps ?? 0))),
        weight: Math.max(...sets.map((s) => s.kg ?? 0)),
        volume: sets.reduce((a, s) => a + (s.kg ?? 0) * (s.reps ?? 0), 0),
        reps: Math.max(...sets.map((s) => s.reps ?? 0)),
      });
    }
    return out.sort((a, b) => a.startedAt - b.startedAt);
  }, [workouts, exerciseId]);

  const bodyweight = sessions.length > 0 && sessions.every((s) => s.weight === 0);
  const [metric, setMetric] = useState<Metric>(bodyweight ? "reps" : "oneRm");
  const metrics: { id: Metric; label: string }[] = bodyweight
    ? [{ id: "reps", label: "Most reps" }]
    : [
        { id: "oneRm", label: "Est. 1RM" },
        { id: "weight", label: "Heaviest" },
        { id: "volume", label: "Volume" },
      ];

  const best = (k: Metric) => Math.max(0, ...sessions.map((s) => s[k]));
  const bestSetVolume = Math.max(0, ...sessions.flatMap((s) => s.sets.map((x) => (x.kg ?? 0) * (x.reps ?? 0))));

  return (
    <Screen>
      <PageHeader title={exercise?.name ?? "Exercise"} subtitle={exercise ? `${exercise.muscle} · ${exercise.equipment}` : undefined} onBack={pop} />
      {sessions.length === 0 ? (
        <Empty icon={<Dumbbell size={26} />} title="No history yet" text="Finish a workout with this exercise to see your progress here." />
      ) : (
        <div className="px-3 pb-10">
          <div className="grid grid-cols-2 gap-2">
            {bodyweight ? (
              <>
                <Stat label="Most reps" value={String(best("reps"))} />
                <Stat label="Sessions" value={String(sessions.length)} />
              </>
            ) : (
              <>
                <Stat label="Heaviest weight" value={`${fmt(show(best("weight")), 1)} ${unit}`} />
                <Stat label="Best est. 1RM" value={`${fmt(show(best("oneRm")), 1)} ${unit}`} />
                <Stat label="Best set volume" value={`${fmt(show(bestSetVolume))} ${unit}`} />
                <Stat label="Sessions" value={String(sessions.length)} />
              </>
            )}
          </div>

          <Card className="mt-3">
            <div className="mb-2 flex gap-1 rounded-lg bg-surf2 p-0.5 text-xs">
              {metrics.map((m) => (
                <button key={m.id} onClick={() => setMetric(m.id)} className={clsx("flex-1 rounded-md py-1.5 font-medium", metric === m.id ? "bg-surf3 text-tx" : "text-tx2")}>
                  {m.label}
                </button>
              ))}
            </div>
            {sessions.length < 2 ? (
              <div className="py-8 text-center text-sm text-tx2">Do this exercise once more to see a trend.</div>
            ) : (
              <LineChart
                data={sessions.map((s) => ({
                  key: s.workoutId,
                  label: `${dayNum(s.date)} ${monthShort(s.date)}`,
                  value: metric === "reps" ? s.reps : show(s[metric]),
                }))}
                color="#3987e5"
                unit={metric === "reps" ? "reps" : unit}
              />
            )}
          </Card>

          <SectionTitle>History</SectionTitle>
          <div className="space-y-2">
            {[...sessions].reverse().map((s) => (
              <button key={s.workoutId} onClick={() => push({ kind: "workoutDetail", workoutId: s.workoutId })} className="w-full rounded-2xl bg-surf p-4 text-left active:bg-surf2">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-semibold">{longDate(s.date)}</span>
                  {!bodyweight && <span className="text-xs text-tx2">1RM {fmt(show(s.oneRm), 1)} {unit}</span>}
                </div>
                {s.sets.map((x, i) => (
                  <div key={x.id} className="flex items-center gap-3 py-0.5 text-sm">
                    <span className="w-4 text-tx3">{i + 1}</span>
                    <span className="flex-1">{formatSet(x, unit)}</span>
                    {x.pr?.length ? <Trophy size={14} className="text-gold" fill="#f5c542" /> : null}
                  </div>
                ))}
              </button>
            ))}
          </div>
        </div>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div className="text-xs text-tx2">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
    </Card>
  );
}
