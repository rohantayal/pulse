import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import clsx from "clsx";
import { allExercises, useApp, useUnit } from "../store/app";
import { dayNum, longDate, monthShort } from "../lib/date";
import { fmt } from "../lib/format";
import { exerciseRecords, formatSet, isCountable, oneRepMax } from "../lib/workout";
import { REGION_LABEL, musclesFor } from "../lib/muscles";
import { Card, PageHeader, Screen, SectionTitle } from "../components/ui";
import { LineChart } from "../components/Charts";
import { ExerciseAnimation } from "../components/ExerciseAnimation";
import { MuscleMap } from "../components/MuscleMap";
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

/**
 * Everything about one exercise: how it's done (animated sketch), what it works (muscle map),
 * your progress over time, every past session, and personal records at the bottom.
 * Opened from the ⓘ next to an exercise, or by tapping its name in a finished workout.
 */
export function ExerciseProgress({ exerciseId, onClose, overlay }: { exerciseId: string; onClose: () => void; overlay?: boolean }) {
  const workouts = useApp((s) => s.workouts);
  const custom = useApp((s) => s.customExercises);
  const { unit, show } = useUnit();
  const [showAll, setShowAll] = useState(false);
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
        reps: sets.reduce((a, s) => a + (s.reps ?? 0), 0),
      });
    }
    return out.sort((a, b) => a.startedAt - b.startedAt);
  }, [workouts, exerciseId]);
  const records = useMemo(() => exerciseRecords(workouts, exerciseId), [workouts, exerciseId]);

  const bodyweight = sessions.length > 0 && sessions.every((s) => s.weight === 0);
  const [metric, setMetric] = useState<Metric>(bodyweight ? "reps" : "weight");
  const metrics: { id: Metric; label: string }[] = bodyweight
    ? [{ id: "reps", label: "Session reps" }]
    : [
        { id: "weight", label: "Heaviest" },
        { id: "oneRm", label: "Est. 1RM" },
        { id: "volume", label: "Volume" },
      ];

  if (!exercise) {
    return (
      <Screen className={overlay ? "z-[70]" : undefined}>
        <PageHeader title="Exercise" onBack={onClose} />
        <div className="px-6 py-10 text-center text-tx2">This exercise no longer exists.</div>
      </Screen>
    );
  }

  const targets = musclesFor(exercise);
  const w = (kg: number) => `${fmt(show(kg), 1)} ${unit}`;
  const history = [...sessions].reverse();
  const visible = showAll ? history : history.slice(0, 5);

  return (
    <Screen className={overlay ? "z-[70]" : undefined}>
      <PageHeader title={exercise.name} subtitle={exercise.equipment} onBack={onClose} />
      <div className="px-3 pb-12">
        {/* How it's done + what it works */}
        <Card className="p-3">
          <div className="overflow-hidden rounded-xl bg-bg/60">
            <ExerciseAnimation exercise={exercise} className="w-full" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="w-[46%] shrink-0">
              <MuscleMap targets={targets} />
            </div>
            <div className="min-w-0 space-y-2 text-sm">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-tx3">
                  <span className="h-2 w-2 rounded-full bg-[#e5484d]" /> Main muscles
                </div>
                <div className="font-medium">{targets.primary.map((r) => REGION_LABEL[r]).join(", ") || exercise.muscle}</div>
              </div>
              {targets.secondary.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-tx3">
                    <span className="h-2 w-2 rounded-full bg-[#e5484d]/45" /> Also works
                  </div>
                  <div className="text-tx2">{targets.secondary.map((r) => REGION_LABEL[r]).join(", ")}</div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Progress */}
        <SectionTitle>Progress</SectionTitle>
        <Card>
          {sessions.length === 0 ? (
            <div className="py-6 text-center text-sm text-tx2">Finish a workout with this exercise to see your progress here.</div>
          ) : (
            <>
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
            </>
          )}
        </Card>

        {/* History */}
        {history.length > 0 && (
          <>
            <SectionTitle>History</SectionTitle>
            <div className="space-y-2">
              {visible.map((s) => (
                <Card key={s.workoutId}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-semibold">{longDate(s.date)}</span>
                    {!bodyweight && <span className="text-xs text-tx2">1RM {w(s.oneRm)}</span>}
                  </div>
                  {s.sets.map((x, i) => (
                    <div key={x.id} className="flex items-center gap-3 py-0.5 text-sm">
                      <span className="w-4 text-tx3">{i + 1}</span>
                      <span className="flex-1">{formatSet(x, unit)}</span>
                      {x.pr?.length ? <Trophy size={14} className="text-gold" fill="#f5c542" /> : null}
                    </div>
                  ))}
                </Card>
              ))}
            </div>
            {history.length > 5 && (
              <button onClick={() => setShowAll((v) => !v)} className="mt-2 w-full py-2 text-sm font-semibold text-acc">
                {showAll ? "Show less" : `Show all ${history.length} sessions`}
              </button>
            )}
          </>
        )}

        {/* Personal records */}
        <SectionTitle>Personal records</SectionTitle>
        <Card className="divide-y divide-line p-0">
          {records.sessions === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-tx2">No records yet.</div>
          ) : bodyweight ? (
            <>
              <RecordRow label="Best set" value={records.mostRepsSet ? `${records.mostRepsSet.set.reps} reps` : "–"} date={records.mostRepsSet?.date} />
              <RecordRow label="Most reps in a session" value={records.mostSessionReps ? `${records.mostSessionReps.value} reps` : "–"} date={records.mostSessionReps?.date} />
            </>
          ) : (
            <>
              <RecordRow label="Best set" value={records.bestSet ? formatSet(records.bestSet.set, unit) : "–"} date={records.bestSet?.date} />
              <RecordRow label="Heaviest weight" value={records.heaviest ? w(records.heaviest.set.kg ?? 0) : "–"} date={records.heaviest?.date} />
              <RecordRow label="Best est. 1RM" value={records.bestOneRm ? w(records.bestOneRm.value) : "–"} date={records.bestOneRm?.date} />
              <RecordRow label="Best set volume" value={records.bestSetVolume ? `${fmt(show(records.bestSetVolume.value))} ${unit}` : "–"} date={records.bestSetVolume?.date} />
              <RecordRow label="Most reps in a session" value={records.mostSessionReps ? `${records.mostSessionReps.value} reps` : "–"} date={records.mostSessionReps?.date} />
              <RecordRow
                label="Best session volume"
                value={records.bestSessionVolume ? `${fmt(show(records.bestSessionVolume.value))} ${unit}` : "–"}
                date={records.bestSessionVolume?.date}
              />
            </>
          )}
        </Card>
      </div>
    </Screen>
  );
}

function RecordRow({ label, value, date }: { label: string; value: string; date?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Trophy size={16} className="shrink-0 text-gold" />
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {date && <div className="text-[11px] text-tx3">{longDate(date)}</div>}
      </div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
