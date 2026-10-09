import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, MoreHorizontal, Plus, Repeat, Settings, Timer, Trash2, Trophy, X } from "lucide-react";
import clsx from "clsx";
import { allExercises, useApp } from "../store/app";
import { useUi } from "../store/ui";
import type { Exercise, PrKind, WorkoutExercise, WorkoutSet } from "../types";
import { formatClock, formatDuration } from "../lib/date";
import { fmt } from "../lib/format";
import { latestWeight } from "../lib/nutrition";
import { PR_LABEL, completedSets, estimateWorkoutCalories, exercisesVolume, formatSet, previousSets } from "../lib/workout";
import { playPrChime, playRestDone } from "../lib/sound";
import { Button, Confirm, Field, NumberInput, Sheet, inputCls } from "../components/ui";
import { ExercisePicker } from "./ExercisePicker";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

interface PrFlash {
  key: number;
  exercise: string;
  set: WorkoutSet;
  kinds: PrKind[];
}

export function ActiveWorkout() {
  const active = useApp((s) => s.active);
  const workouts = useApp((s) => s.workouts);
  const custom = useApp((s) => s.customExercises);
  const settings = useApp((s) => s.settings);
  const { setWorkoutOpen, showToast } = useUi();
  const now = useNow();

  const [picker, setPicker] = useState<null | { mode: "add" } | { mode: "replace"; weId: string }>(null);
  const [menuFor, setMenuFor] = useState<WorkoutExercise | null>(null);
  const [setMenu, setSetMenu] = useState<{ weId: string; set: WorkoutSet; n: number } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [flash, setFlash] = useState<PrFlash | null>(null);
  const [restEnd, setRestEnd] = useState<number | null>(null);

  const byId = useMemo(() => new Map(allExercises(custom).map((e) => [e.id, e])), [custom]);

  // Rest timer completion
  const restLeft = restEnd ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0;
  useEffect(() => {
    if (restEnd && restLeft === 0) {
      setRestEnd(null);
      playRestDone();
      navigator.vibrate?.([120, 80, 120]);
    }
  }, [restEnd, restLeft]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2600);
    return () => clearTimeout(t);
  }, [flash]);

  if (!active) return null;

  const volume = exercisesVolume(active.exercises);
  const sets = completedSets(active.exercises);
  const store = useApp.getState();

  function tick(we: WorkoutExercise, s: WorkoutSet, prev?: WorkoutSet) {
    const wasDone = s.done;
    const fill = settings.autofillPrevious && prev ? { kg: prev.kg, reps: prev.reps } : undefined;
    const prs = store.toggleSet(we.id, s.id, fill);
    const after = useApp.getState().active?.exercises.find((e) => e.id === we.id)?.sets.find((x) => x.id === s.id);
    if (!wasDone && !after?.done) {
      showToast("Enter reps first");
      return;
    }
    if (wasDone) return;
    navigator.vibrate?.(15);
    if (prs.length > 0 && after) {
      if (settings.prSound) playPrChime();
      navigator.vibrate?.([30, 40, 60]);
      setFlash({ key: Date.now(), exercise: byId.get(we.exerciseId)?.name ?? "", set: after, kinds: prs });
    }
    if (settings.restTimer > 0) setRestEnd(Date.now() + settings.restTimer * 1000);
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg animate-slide-up">
      <div className="mx-auto flex h-full w-full max-w-md flex-col">
        {/* Header */}
        <header className="pt-safe border-b border-line bg-bg">
          <div className="flex h-14 items-center gap-2 px-2">
            <button onClick={() => setWorkoutOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full active:bg-surf2" aria-label="Minimise">
              <ChevronDown size={24} />
            </button>
            <button onClick={() => setRenaming(true)} className="min-w-0 flex-1 truncate text-left text-[17px] font-semibold">
              {active.name}
            </button>
            <Button className="h-9 px-4 text-sm" onClick={() => setFinishing(true)}>
              Finish
            </Button>
          </div>
          {/* duration | volume | sets */}
          <div className="grid grid-cols-3 px-4 pb-3">
            <TopStat label="Duration" value={formatDuration(now - active.startedAt)} accent />
            <TopStat label="Volume" value={`${fmt(volume)} kg`} />
            <TopStat label="Sets" value={String(sets)} />
          </div>
        </header>

        <div className="no-scrollbar flex-1 overflow-y-auto pb-40">
          {active.exercises.length === 0 && (
            <div className="px-8 py-14 text-center">
              <div className="text-[17px] font-semibold">Get started</div>
              <p className="mt-1 text-sm text-tx2">Add an exercise to start your workout</p>
            </div>
          )}

          {active.exercises.map((we) => (
            <ExerciseBlock
              key={we.id}
              we={we}
              exercise={byId.get(we.exerciseId)}
              previous={previousSets(workouts, we.exerciseId)}
              onTick={tick}
              onMenu={() => setMenuFor(we)}
              onSetMenu={(set, n) => setSetMenu({ weId: we.id, set, n })}
            />
          ))}

          <div className="space-y-3 px-4 pt-4">
            <Button className="w-full" onClick={() => setPicker({ mode: "add" })}>
              <Plus size={18} /> Add exercise
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
                <Settings size={16} /> Settings
              </Button>
              <Button variant="danger" onClick={() => setConfirmDiscard(true)}>
                Discard workout
              </Button>
            </div>
          </div>
        </div>

        {/* Rest timer */}
        {restEnd && restLeft > 0 && (
          <div className="pb-safe absolute inset-x-0 bottom-0 mx-auto max-w-md px-4 pb-4">
            <div className="flex items-center gap-3 rounded-2xl bg-surf2 p-3 shadow-2xl shadow-black">
              <Timer size={20} className="text-acc" />
              <div className="flex-1">
                <div className="text-xs text-tx2">Rest</div>
                <div className="text-xl font-bold tabular-nums">{formatClock(restLeft)}</div>
              </div>
              <button onClick={() => setRestEnd((e) => (e ? Math.max(Date.now() + 1000, e - 15000) : e))} className="rounded-lg bg-surf3 px-3 py-2 text-sm font-semibold">
                −15
              </button>
              <button onClick={() => setRestEnd((e) => (e ? e + 15000 : e))} className="rounded-lg bg-surf3 px-3 py-2 text-sm font-semibold">
                +15
              </button>
              <button onClick={() => setRestEnd(null)} className="rounded-lg bg-acc px-3 py-2 text-sm font-semibold text-white">
                Skip
              </button>
            </div>
          </div>
        )}
      </div>

      {flash && <PrCelebration key={flash.key} flash={flash} onClose={() => setFlash(null)} />}

      {picker && (
        <ExercisePicker
          multi={picker.mode === "add"}
          title={picker.mode === "add" ? "Add exercises" : "Replace exercise"}
          onClose={() => setPicker(null)}
          onPick={(ids) => {
            if (picker.mode === "add") store.addExercises(ids);
            else store.replaceExercise(picker.weId, ids[0]);
            setPicker(null);
          }}
        />
      )}

      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor ? byId.get(menuFor.exerciseId)?.name : ""}>
        {menuFor && (
          <div className="space-y-2">
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => {
                setPicker({ mode: "replace", weId: menuFor.id });
                setMenuFor(null);
              }}
            >
              <Repeat size={16} /> Replace exercise
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" className="justify-start" onClick={() => store.moveExercise(menuFor.id, -1)}>
                <ArrowUp size={16} /> Move up
              </Button>
              <Button variant="secondary" className="justify-start" onClick={() => store.moveExercise(menuFor.id, 1)}>
                <ArrowDown size={16} /> Move down
              </Button>
            </div>
            <Button
              variant="danger"
              className="w-full justify-start"
              onClick={() => {
                store.removeExercise(menuFor.id);
                setMenuFor(null);
              }}
            >
              <X size={16} /> Remove exercise
            </Button>
          </div>
        )}
      </Sheet>

      <Sheet open={!!setMenu} onClose={() => setSetMenu(null)} title={setMenu ? `Set ${setMenu.n}` : ""}>
        {setMenu && (
          <Button
            variant="danger"
            className="w-full"
            onClick={() => {
              store.removeSet(setMenu.weId, setMenu.set.id);
              setSetMenu(null);
            }}
          >
            <Trash2 size={16} /> Delete set
          </Button>
        )}
      </Sheet>

      <WorkoutSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <Sheet open={renaming} onClose={() => setRenaming(false)} title="Workout name">
        <input className={inputCls} defaultValue={active.name} autoFocus onChange={(e) => store.renameActive(e.target.value)} />
        <Button className="mt-4 w-full" onClick={() => setRenaming(false)}>
          Done
        </Button>
      </Sheet>

      {finishing && <FinishSheet onClose={() => setFinishing(false)} />}

      <Confirm
        open={confirmDiscard}
        title="Discard workout?"
        message="Everything you logged in this workout will be lost."
        confirmLabel="Discard workout"
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          store.discardWorkout();
          setWorkoutOpen(false);
        }}
      />
    </div>
  );
}

function TopStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-xs text-tx2">{label}</div>
      <div className={clsx("text-[17px] font-semibold tabular-nums", accent && "text-acc")}>{value}</div>
    </div>
  );
}

function ExerciseBlock({
  we,
  exercise,
  previous,
  onTick,
  onMenu,
  onSetMenu,
}: {
  we: WorkoutExercise;
  exercise?: Exercise;
  previous: WorkoutSet[];
  onTick: (we: WorkoutExercise, s: WorkoutSet, prev?: WorkoutSet) => void;
  onMenu: () => void;
  onSetMenu: (s: WorkoutSet, n: number) => void;
}) {
  const store = useApp.getState();
  return (
    <section className="border-b border-line px-4 py-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surf3 text-sm font-bold text-tx2">{exercise?.name.charAt(0) ?? "?"}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-semibold text-acc">{exercise?.name ?? "Unknown exercise"}</div>
          {exercise && <div className="text-xs text-tx3">{exercise.muscle}</div>}
        </div>
        <button onClick={onMenu} className="rounded-full p-1.5 text-tx2 active:bg-surf2" aria-label="Exercise options">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* SET | PREVIOUS | KG | REPS | ✓ */}
      <div className="grid grid-cols-[2.25rem_1fr_4.5rem_4rem_2.5rem] items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-tx3">
        <div className="text-center">Set</div>
        <div>Previous</div>
        <div className="text-center">Kg</div>
        <div className="text-center">Reps</div>
        <div className="flex justify-center">
          <Check size={14} />
        </div>
      </div>

      <div className="mt-1 space-y-1">
        {we.sets.map((s, i) => {
          const prev = previous[i];
          const pr = s.done && s.pr && s.pr.length > 0;
          return (
            <div
              key={s.id}
              className={clsx(
                "grid grid-cols-[2.25rem_1fr_4.5rem_4rem_2.5rem] items-center gap-2 rounded-lg px-1 py-1 transition-colors",
                s.done && (pr ? "bg-gold/15" : "bg-good/15"),
              )}
            >
              <button onClick={() => onSetMenu(s, i + 1)} className="flex h-8 items-center justify-center rounded-md text-sm font-semibold active:bg-surf3">
                {pr ? <Trophy size={16} className="text-gold" fill="#f5c542" /> : i + 1}
              </button>
              <button
                onClick={() => prev && store.updateSet(we.id, s.id, { kg: prev.kg, reps: prev.reps })}
                className="truncate text-left text-sm text-tx2"
                title="Tap to copy"
              >
                {prev ? formatSet(prev) : "–"}
              </button>
              <SetInput value={s.kg} placeholder={prev?.kg != null ? String(+prev.kg.toFixed(2)) : "0"} onChange={(v) => store.updateSet(we.id, s.id, { kg: v })} done={s.done} />
              <SetInput
                value={s.reps}
                placeholder={prev?.reps != null ? String(prev.reps) : "0"}
                onChange={(v) => store.updateSet(we.id, s.id, { reps: v == null ? null : Math.round(v) })}
                done={s.done}
                integer
              />
              <button
                onClick={() => onTick(we, s, prev)}
                aria-label={s.done ? "Mark set not done" : "Complete set"}
                className={clsx(
                  "mx-auto flex h-8 w-8 items-center justify-center rounded-md transition",
                  s.done ? (pr ? "bg-gold text-black" : "bg-good text-white") : "bg-surf3 text-tx2",
                )}
              >
                <Check size={18} strokeWidth={3} />
              </button>
            </div>
          );
        })}
      </div>

      <button onClick={() => store.addSet(we.id)} className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-surf2 text-sm font-semibold active:bg-surf3">
        <Plus size={16} /> Add set
      </button>
    </section>
  );
}

function SetInput({
  value,
  placeholder,
  onChange,
  done,
  integer,
}: {
  value: number | null;
  placeholder: string;
  onChange: (v: number | null) => void;
  done: boolean;
  integer?: boolean;
}) {
  return (
    <input
      type="number"
      inputMode={integer ? "numeric" : "decimal"}
      step={integer ? "1" : "any"}
      min={0}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
      onFocus={(e) => e.target.select()}
      className={clsx(
        "h-8 w-full rounded-md text-center text-[15px] font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-tx3 focus:ring-2 focus:ring-acc",
        done ? "bg-transparent" : "bg-surf2",
      )}
    />
  );
}

function PrCelebration({ flash, onClose }: { flash: PrFlash; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-8" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />
      <div className="relative flex flex-col items-center rounded-3xl bg-surf2/95 px-8 py-7 text-center shadow-2xl animate-fade-in">
        <div className="relative animate-pr-pop">
          <div className="absolute inset-0 -m-4 rounded-full bg-gold/25 blur-xl" />
          <svg width="88" height="88" viewBox="0 0 64 64" className="relative" aria-hidden>
            <defs>
              <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffe28a" />
                <stop offset="0.5" stopColor="#f5c542" />
                <stop offset="1" stopColor="#c98a12" />
              </linearGradient>
            </defs>
            <path d="M22 44h20l-3 8H25z" fill="#c98a12" />
            <rect x="18" y="52" width="28" height="6" rx="2" fill="url(#gold)" />
            <path d="M16 8h32v12c0 10-7 18-16 18S16 30 16 20z" fill="url(#gold)" />
            <path d="M16 12H8v4c0 7 5 12 11 12M48 12h8v4c0 7-5 12-11 12" fill="none" stroke="url(#gold)" strokeWidth="4" />
            <rect x="29" y="37" width="6" height="8" fill="#e0a92a" />
            <path d="M32 14l2.4 5 5.4.6-4 3.7 1.1 5.3L32 26l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z" fill="#fff6d6" />
          </svg>
        </div>
        <div className="mt-3 text-xl font-bold text-gold">New PR!</div>
        <div className="mt-1 text-sm font-semibold">{flash.exercise}</div>
        <div className="text-sm text-tx2">{formatSet(flash.set)}</div>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {flash.kinds.map((k) => (
            <span key={k} className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold">
              {PR_LABEL[k]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkoutSettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);
  return (
    <Sheet open={open} onClose={onClose} title="Workout settings">
      <div className="space-y-5">
        <Field label="Rest timer after each set">
          <div className="grid grid-cols-5 gap-2">
            {[0, 60, 90, 120, 180].map((sec) => (
              <button
                key={sec}
                onClick={() => setSettings({ restTimer: sec })}
                className={clsx("rounded-lg py-2 text-sm font-medium", settings.restTimer === sec ? "bg-acc text-white" : "bg-surf2 text-tx2")}
              >
                {sec === 0 ? "Off" : formatClock(sec)}
              </button>
            ))}
          </div>
        </Field>
        <Toggle label="PR sound" hint="Play a chime when you set a new personal record" on={settings.prSound} onChange={(v) => setSettings({ prSound: v })} />
        <Toggle
          label="Auto-fill from previous"
          hint="Ticking an empty set uses last time's weight and reps"
          on={settings.autofillPrevious}
          onChange={(v) => setSettings({ autofillPrevious: v })}
        />
      </div>
    </Sheet>
  );
}

export function Toggle({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center gap-3 text-left">
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        {hint && <div className="text-xs text-tx2">{hint}</div>}
      </div>
      <div className={clsx("relative h-7 w-12 shrink-0 rounded-full transition", on ? "bg-good" : "bg-surf3")}>
        <div className={clsx("absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all", on ? "left-[22px]" : "left-0.5")} />
      </div>
    </button>
  );
}

function FinishSheet({ onClose }: { onClose: () => void }) {
  const active = useApp((s) => s.active)!;
  const weights = useApp((s) => s.weights);
  const { setWorkoutOpen, showToast, push } = useUi();
  const duration = Date.now() - active.startedAt;
  const [name, setName] = useState(active.name);
  const [kcal, setKcal] = useState<number | null>(() => estimateWorkoutCalories(duration, latestWeight(weights, active.date) ?? 70));
  const [notes, setNotes] = useState("");
  const sets = completedSets(active.exercises);
  const prCount = active.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done && s.pr?.length).length, 0);

  return (
    <Sheet open onClose={onClose} title="Finish workout">
      {sets === 0 ? (
        <div className="py-4 text-center text-sm text-tx2">
          Complete at least one set (tap the ✓) before finishing — or discard the workout.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2 rounded-2xl bg-surf2 p-3 text-center">
            <Mini label="Duration" value={formatDuration(duration)} />
            <Mini label="Volume" value={`${fmt(exercisesVolume(active.exercises))}`} />
            <Mini label="Sets" value={String(sets)} />
            <Mini label="PRs" value={String(prCount)} gold={prCount > 0} />
          </div>
          <Field label="Workout name">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Calories burned" hint="Estimated from duration and body weight — edit if your watch says otherwise.">
            <NumberInput value={kcal} onChange={setKcal} suffix="kcal" step="1" />
          </Field>
          <Field label="Notes">
            <textarea className={clsx(inputCls, "h-20 py-2")} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel?" />
          </Field>
          <Button
            className="w-full"
            onClick={() => {
              const w = useApp.getState().finishWorkout({ name, caloriesBurned: kcal ?? 0, notes });
              if (!w) return;
              setWorkoutOpen(false);
              showToast("Workout saved 💪");
              push({ kind: "workoutDetail", workoutId: w.id });
            }}
          >
            Save workout
          </Button>
          <p className="text-center text-xs text-tx3">Sets that aren't ticked won't be saved.</p>
        </div>
      )}
    </Sheet>
  );
}

function Mini({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div>
      <div className={clsx("text-[15px] font-semibold tabular-nums", gold && "text-gold")}>{value}</div>
      <div className="text-[11px] text-tx2">{label}</div>
    </div>
  );
}
