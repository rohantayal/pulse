import { useMemo } from "react";
import { CheckCircle2, Scale, TrendingDown, TrendingUp, X } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store/app";
import { useUi } from "../store/ui";
import { todayKey } from "../lib/date";
import { macrosFor, splitOf } from "../lib/plan";
import { weeklyCheckin, type Checkin } from "../lib/checkin";
import { Button, Card } from "./ui";

const WEEK = 7 * 864e5;

export function useCheckin(): Checkin {
  const weights = useApp((s) => s.weights);
  const foodLog = useApp((s) => s.foodLog);
  const goals = useApp((s) => s.nutritionGoals);
  const profile = useApp((s) => s.profile);
  return useMemo(() => weeklyCheckin({ weights, foodLog, goals, profile, today: todayKey() }), [weights, foodLog, goals, profile]);
}

/** Apply a suggested calorie goal, keeping the current macro split. */
function applySuggestion(calories: number) {
  const s = useApp.getState();
  const g = s.nutritionGoals;
  const m = macrosFor(calories, splitOf(g));
  s.setNutritionGoals({ ...g, calories, ...m });
}

/**
 * The weekly check-in. `home` shows it on Today at most once a week, and only when there's
 * something to say; on the Weight page it's always there.
 */
export function CheckinCard({ home }: { home?: boolean }) {
  const c = useCheckin();
  const seenAt = useApp((s) => s.checkinSeenAt);
  const showToast = useUi((s) => s.showToast);
  if (home && (c.kind === "need-data" || (seenAt && Date.now() - seenAt < WEEK))) return null;

  const seen = () => useApp.getState().markCheckinSeen();
  const Icon = c.kind === "on-track" ? CheckCircle2 : c.kind === "need-data" ? Scale : (c.delta ?? 0) > 0 ? TrendingUp : TrendingDown;

  return (
    <Card className={clsx("mt-3", home && "border border-acc/25")}>
      <div className="flex items-start gap-3">
        <div className={clsx("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", c.kind === "on-track" ? "bg-good/15 text-good" : "bg-acc/15 text-acc")}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          {home && <div className="text-[11px] font-semibold uppercase tracking-wide text-tx3">Weekly check-in</div>}
          <div className="font-semibold">{c.title}</div>
          <p className="mt-0.5 text-sm leading-snug text-tx2">{c.message}</p>
        </div>
        {home && (
          <button onClick={seen} className="-mr-1 -mt-1 rounded-full p-1.5 text-tx3 active:bg-surf2" aria-label="Dismiss check-in">
            <X size={16} />
          </button>
        )}
      </div>
      {c.kind === "adjust" && c.suggested && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" className="h-10 text-sm" onClick={seen}>
            Keep {useApp.getState().nutritionGoals.calories}
          </Button>
          <Button
            className="h-10 text-sm"
            onClick={() => {
              applySuggestion(c.suggested!);
              seen();
              showToast(`Daily goal is now ${c.suggested} kcal`);
            }}
          >
            Use {c.suggested} kcal
          </Button>
        </div>
      )}
      {home && c.kind !== "adjust" && (
        <Button variant="secondary" className="mt-3 h-10 w-full text-sm" onClick={seen}>
          Got it
        </Button>
      )}
    </Card>
  );
}
