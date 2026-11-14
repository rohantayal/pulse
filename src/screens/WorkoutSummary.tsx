import { useEffect, useMemo } from "react";
import { Share2, Trophy } from "lucide-react";
import clsx from "clsx";
import { Share } from "@capacitor/share";
import { allExercises, useApp, useUnit } from "../store/app";
import { useUi } from "../store/ui";
import { formatDuration } from "../lib/date";
import { fmt } from "../lib/format";
import { formatSet } from "../lib/workout";
import { changeLabel, shareText, workoutSummary } from "../lib/summary";
import { isNative } from "../lib/platform";
import { Button, Card, Screen, SectionTitle } from "../components/ui";
import { ExerciseThumb } from "../components/ExerciseThumb";

/** Shown right after Finish: how today went and how it compares with last time. */
export function WorkoutSummary({ workoutId }: { workoutId: string }) {
  const workouts = useApp((s) => s.workouts);
  const custom = useApp((s) => s.customExercises);
  const { unit, show } = useUnit();
  const { pop, push, showToast } = useUi();
  const w = workouts.find((x) => x.id === workoutId);
  const byId = useMemo(() => new Map(allExercises(custom).map((e) => [e.id, e])), [custom]);
  const s = useMemo(() => (w ? workoutSummary(w, workouts) : null), [w, workouts]);

  useEffect(() => {
    if (!w) pop();
  }, [w, pop]);
  if (!w || !s) return null;

  const duration = formatDuration(s.durationMs);
  const improved = s.exercises.filter((c) => c.lastBest && ((c.deltaKg ?? 0) > 0 || ((c.deltaKg ?? 0) === 0 && c.deltaReps > 0))).length;
  const headline = s.prCount
    ? `${s.prCount} new PR${s.prCount > 1 ? "s" : ""}!`
    : improved
      ? `Stronger on ${improved} exercise${improved > 1 ? "s" : ""}`
      : "Workout done";

  async function share() {
    const names = new Map([...byId].map(([id, e]) => [id, e.name]));
    const text = shareText(w!, s!, names, unit, duration);
    try {
      if (isNative) await Share.share({ title: w!.name, text, dialogTitle: "Share workout" });
      else if (navigator.share) await navigator.share({ title: w!.name, text });
      else {
        await navigator.clipboard.writeText(text);
        showToast("Summary copied");
      }
    } catch {
      /* share cancelled */
    }
  }

  return (
    <Screen>
      <div className="pt-safe px-4 pb-10">
        <div className="flex flex-col items-center pt-8 text-center">
          <div className={clsx("flex h-20 w-20 items-center justify-center rounded-full animate-pr-pop", s.prCount ? "bg-gold/20" : "bg-good/15")}>
            {s.prCount ? <Trophy size={40} className="text-gold" fill="#f5c542" /> : <span className="text-4xl">💪</span>}
          </div>
          <h1 className="mt-4 text-[26px] font-bold">{headline}</h1>
          <p className="mt-1 text-sm text-tx2">
            {w.name} · {new Date(w.startedAt).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Tile label="Duration" value={duration} delta={s.durationDeltaMs == null ? null : `${s.durationDeltaMs >= 0 ? "+" : "−"}${formatDuration(Math.abs(s.durationDeltaMs))}`} neutral />
          <Tile
            label="Volume"
            value={`${fmt(show(s.volume))} ${unit}`}
            delta={s.volumeDeltaPct == null ? null : `${s.volumeDeltaPct >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(s.volumeDeltaPct))}%`}
            good={s.volumeDeltaPct != null && s.volumeDeltaPct >= 0}
          />
          <Tile label="Sets" value={String(s.sets)} />
          <Tile label="PRs" value={String(s.prCount)} gold={s.prCount > 0} />
        </div>
        {s.previous && <p className="mt-2 text-center text-xs text-tx3">Compared with your last {w.name} session</p>}

        <SectionTitle>Exercises</SectionTitle>
        <Card className="divide-y divide-line p-0">
          {s.exercises.map((c) => {
            const ex = byId.get(c.exerciseId);
            const label = changeLabel(c, unit);
            const up = label.startsWith("+");
            const down = label.startsWith("−");
            return (
              <div key={c.exerciseId} className="flex items-center gap-3 px-4 py-3">
                <ExerciseThumb exercise={ex} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate font-medium">
                    <span className="truncate">{ex?.name ?? "Exercise"}</span>
                    {c.prs.length > 0 && <Trophy size={14} className="shrink-0 text-gold" fill="#f5c542" />}
                  </div>
                  <div className="text-xs text-tx2">
                    Best {formatSet(c.best, unit)}
                    {c.lastBest && <span className="text-tx3"> · last {formatSet(c.lastBest, unit)}</span>}
                  </div>
                </div>
                <span className={clsx("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", up ? "bg-good/15 text-good" : down ? "bg-bad/10 text-bad" : "bg-surf2 text-tx2")}>
                  {label}
                </span>
              </div>
            );
          })}
        </Card>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={share}>
            <Share2 size={16} /> Share
          </Button>
          <Button onClick={pop}>Done</Button>
        </div>
        <button
          onClick={() => {
            pop();
            push({ kind: "workoutDetail", workoutId: w.id });
          }}
          className="mt-3 w-full py-2 text-sm font-semibold text-acc"
        >
          View all sets
        </button>
      </div>
    </Screen>
  );
}

function Tile({ label, value, delta, good, neutral, gold }: { label: string; value: string; delta?: string | null; good?: boolean; neutral?: boolean; gold?: boolean }) {
  return (
    <Card className="text-center">
      <div className={clsx("text-xl font-bold tabular-nums", gold && "text-gold")}>{value}</div>
      <div className="text-xs text-tx2">{label}</div>
      {delta && <div className={clsx("mt-1 text-xs font-semibold tabular-nums", neutral ? "text-tx3" : good ? "text-good" : "text-bad")}>{delta}</div>}
    </Card>
  );
}
