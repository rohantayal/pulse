import { useMemo, useState, type ReactNode } from "react";
import { Activity as ActivityIcon, ChevronLeft, Dumbbell, Flame, Scale, Sparkles, Target, Trophy, Utensils } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store/app";
import { ACTIVITY, bmi, buildPlan, goalBlocked, maxPace, type Activity, type GoalType, type Profile, type Sex } from "../lib/plan";
import { fmt } from "../lib/format";
import { Button, NumberInput, inputCls } from "../components/ui";

type Step = "welcome" | "about" | "activity" | "goal" | "plan";
const STEPS: Step[] = ["welcome", "about", "activity", "goal", "plan"];

const DEFAULT: Profile = { sex: "male", age: 25, heightCm: 170, weightKg: 70, activity: "light", goal: "maintain", pace: 0.5, workoutsPerWeek: 3 };

/** First-run setup: a few questions → personalised calorie, macro and step targets. */
export function Onboarding({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const existing = useApp((s) => s.profile);
  const [step, setStep] = useState<Step>(existing ? "about" : "welcome");
  const [p, setP] = useState<Profile>(existing ?? DEFAULT);
  const [age, setAge] = useState<number | null>(existing?.age ?? null);
  const [weight, setWeight] = useState<number | null>(existing?.weightKg ?? null);
  const [heightCm, setHeightCm] = useState<number | null>(existing?.heightCm ?? null);
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("ft");

  const i = STEPS.indexOf(step);
  const next = () => setStep(STEPS[Math.min(STEPS.length - 1, i + 1)]);
  const back = () => (i <= (existing ? 1 : 0) ? onCancel?.() : setStep(STEPS[i - 1]));
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));

  const aboutValid = age != null && age >= 13 && age <= 100 && weight != null && weight >= 30 && weight <= 300 && heightCm != null && heightCm >= 120 && heightCm <= 230;
  const full: Profile = { ...p, age: age ?? p.age, weightKg: weight ?? p.weightKg, heightCm: heightCm ?? p.heightCm };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg animate-fade-in">
      <div className="mx-auto flex h-full w-full max-w-md flex-col">
        {step !== "welcome" && (
          <header className="pt-safe">
            <div className="flex h-14 items-center gap-2 px-2">
              <button onClick={back} className="flex h-10 w-10 items-center justify-center rounded-full active:bg-surf2" aria-label="Back">
                <ChevronLeft size={24} />
              </button>
              <div className="flex flex-1 gap-1.5 pr-4">
                {STEPS.slice(1).map((s, idx) => (
                  <div key={s} className={clsx("h-1 flex-1 rounded-full transition-colors", idx < i ? "bg-acc" : "bg-surf3")} />
                ))}
              </div>
            </div>
          </header>
        )}

        <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-40">
          {step === "welcome" && <Welcome />}
          {step === "about" && (
            <AboutStep
              p={p}
              set={set}
              age={age}
              setAge={setAge}
              weight={weight}
              setWeight={setWeight}
              heightCm={heightCm}
              setHeightCm={setHeightCm}
              heightUnit={heightUnit}
              setHeightUnit={setHeightUnit}
            />
          )}
          {step === "activity" && <ActivityStep value={p.activity} onChange={(activity) => set({ activity })} />}
          {step === "goal" && <GoalStep p={full} set={set} />}
          {step === "plan" && <PlanStep p={full} onDone={onDone} />}
        </div>

        {step !== "plan" && (
          <div className="pb-safe fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-bg via-bg to-transparent px-5 pt-6">
            <Button className="mb-5 h-12 w-full text-base" onClick={next} disabled={step === "about" && !aboutValid}>
              {step === "welcome" ? "Get started" : "Continue"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6 mt-2">
      <h1 className="text-[26px] font-bold leading-tight">{children}</h1>
      {sub && <p className="mt-2 text-[15px] text-tx2">{sub}</p>}
    </div>
  );
}

function Welcome() {
  const features = [
    { icon: <Utensils size={20} />, title: "Log meals by typing", text: "“2 roti, dal, 150g paneer” — calories and macros in seconds." },
    { icon: <Dumbbell size={20} />, title: "Track every set", text: "Routines, previous numbers, rest timer and golden PRs." },
    { icon: <Sparkles size={20} />, title: "Honest feedback", text: "Praise when a meal earns it, a nudge when it doesn't." },
  ];
  return (
    <div className="pt-safe flex min-h-full flex-col justify-center py-10">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-acc/15">
        <svg viewBox="0 0 64 64" width="52" height="52" aria-hidden>
          <path d="M6 34h12l5-12 8 22 6-16 4 6h17" fill="none" stroke="#3987e5" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-[34px] font-bold leading-tight">
        Train hard.
        <br />
        Eat smart.
      </h1>
      <p className="mt-3 text-[16px] text-tx2">Pulse brings your workouts and your nutrition into one place. Let's set up a plan that fits you — it takes about a minute.</p>
      <div className="mt-8 space-y-4">
        {features.map((f) => (
          <div key={f.title} className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surf2 text-acc">{f.icon}</div>
            <div>
              <div className="font-semibold">{f.title}</div>
              <div className="text-sm text-tx2">{f.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Choice({ selected, onClick, children, disabled }: { selected: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "w-full rounded-2xl border-2 p-4 text-left transition active:scale-[0.99] disabled:opacity-40",
        selected ? "border-acc bg-acc/10" : "border-transparent bg-surf",
      )}
    >
      {children}
    </button>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-tx2">{children}</div>;
}

function AboutStep(props: {
  p: Profile;
  set: (x: Partial<Profile>) => void;
  age: number | null;
  setAge: (v: number | null) => void;
  weight: number | null;
  setWeight: (v: number | null) => void;
  heightCm: number | null;
  setHeightCm: (v: number | null) => void;
  heightUnit: "cm" | "ft";
  setHeightUnit: (u: "cm" | "ft") => void;
}) {
  const { p, set, age, setAge, weight, setWeight, heightCm, setHeightCm, heightUnit, setHeightUnit } = props;
  // Feet and inches are kept exactly as typed; converting back from rounded cm on every
  // keystroke would turn 5 ft into 4 ft 12 in.
  const [ft, setFt] = useState<number | null>(() => (heightCm != null ? Math.floor(heightCm / 2.54 / 12) : null));
  const [inch, setInch] = useState<number | null>(() => (heightCm != null ? Math.round(heightCm / 2.54 - Math.floor(heightCm / 2.54 / 12) * 12) : null));
  const setFtIn = (f: number | null, i: number | null) => {
    setFt(f);
    setInch(i);
    setHeightCm(f == null ? null : ((f ?? 0) * 12 + (i ?? 0)) * 2.54);
  };
  const switchUnit = (u: "cm" | "ft") => {
    if (u === "ft" && heightCm != null) {
      const total = heightCm / 2.54;
      let f = Math.floor(total / 12);
      let i = Math.round(total - f * 12);
      if (i === 12) {
        f += 1;
        i = 0;
      }
      setFt(f);
      setInch(i);
    }
    setHeightUnit(u);
  };

  return (
    <div>
      <Title sub="We use this to estimate how many calories your body burns. It stays on this device.">About you</Title>
      <div className="space-y-5">
        <div>
          <Label>Name (optional)</Label>
          <input className={inputCls} value={p.name ?? ""} onChange={(e) => set({ name: e.target.value || undefined })} placeholder="What should we call you?" />
        </div>
        <div>
          <Label>Sex</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["male", "female"] as Sex[]).map((s) => (
              <Choice key={s} selected={p.sex === s} onClick={() => set({ sex: s })}>
                <div className="text-center font-semibold capitalize">{s}</div>
              </Choice>
            ))}
          </div>
          <div className="mt-1 text-xs text-tx3">Used only for the calorie formula.</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Age</Label>
            <NumberInput value={age} onChange={(v) => setAge(v == null ? null : Math.round(v))} suffix="yrs" step="1" />
          </div>
          <div>
            <Label>Weight</Label>
            <NumberInput value={weight} onChange={setWeight} suffix="kg" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label>Height</Label>
            <div className="mb-2 flex rounded-lg bg-surf2 p-0.5 text-xs font-medium">
              {(["ft", "cm"] as const).map((u) => (
                <button key={u} onClick={() => switchUnit(u)} className={clsx("rounded-md px-2.5 py-1", heightUnit === u ? "bg-surf3 text-tx" : "text-tx2")}>
                  {u === "ft" ? "ft / in" : "cm"}
                </button>
              ))}
            </div>
          </div>
          {heightUnit === "cm" ? (
            <NumberInput value={heightCm == null ? null : Math.round(heightCm)} onChange={(v) => setHeightCm(v)} suffix="cm" step="1" />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <NumberInput value={ft} onChange={(v) => setFtIn(v, inch)} suffix="ft" step="1" />
              <NumberInput value={inch} onChange={(v) => setFtIn(ft, v)} suffix="in" step="1" />
            </div>
          )}
        </div>
        {age != null && age < 13 && <p className="text-sm text-gold">Pulse is for ages 13 and up.</p>}
      </div>
    </div>
  );
}

function ActivityStep({ value, onChange }: { value: Activity; onChange: (a: Activity) => void }) {
  return (
    <div>
      <Title sub="Not counting workouts — just a normal day.">How active is your day?</Title>
      <div className="space-y-2">
        {(Object.keys(ACTIVITY) as Activity[]).map((a) => (
          <Choice key={a} selected={value === a} onClick={() => onChange(a)}>
            <div className="flex items-center gap-3">
              <ActivityIcon size={20} className={value === a ? "text-acc" : "text-tx3"} />
              <div>
                <div className="font-semibold">{ACTIVITY[a].label}</div>
                <div className="text-sm text-tx2">{ACTIVITY[a].hint}</div>
              </div>
            </div>
          </Choice>
        ))}
      </div>
    </div>
  );
}

const GOALS: { id: GoalType; label: string; hint: string; icon: ReactNode }[] = [
  { id: "lose", label: "Lose fat", hint: "Eat a little less than you burn", icon: <Flame size={20} /> },
  { id: "maintain", label: "Stay fit", hint: "Keep your weight, build habits", icon: <Scale size={20} /> },
  { id: "gain", label: "Build muscle", hint: "Eat a little more and train hard", icon: <Dumbbell size={20} /> },
];

function GoalStep({ p, set }: { p: Profile; set: (x: Partial<Profile>) => void }) {
  const max = maxPace(p.goal, p.weightKg);
  const paces = (p.goal === "lose" ? [0.25, 0.5, 0.75, 1] : [0.25, 0.5]).filter((x) => x <= max);
  return (
    <div>
      <Title sub="You can change this any time.">What's your goal?</Title>
      <div className="space-y-2">
        {GOALS.map((g) => {
          const blocked = goalBlocked(g.id, p);
          return (
            <Choice key={g.id} selected={p.goal === g.id} disabled={!!blocked} onClick={() => set({ goal: g.id, pace: g.id === "lose" ? 0.5 : 0.25 })}>
              <div className="flex items-center gap-3">
                <span className={p.goal === g.id ? "text-acc" : "text-tx3"}>{g.icon}</span>
                <div>
                  <div className="font-semibold">{g.label}</div>
                  <div className="text-sm text-tx2">{blocked ?? g.hint}</div>
                </div>
              </div>
            </Choice>
          );
        })}
      </div>

      {p.goal !== "maintain" && (
        <div className="mt-6">
          <Label>Pace</Label>
          <div className="grid grid-cols-4 gap-2">
            {paces.map((x) => (
              <button
                key={x}
                onClick={() => set({ pace: x })}
                className={clsx("rounded-xl py-2.5 text-sm font-semibold", p.pace === x ? "bg-acc text-white" : "bg-surf2 text-tx2")}
              >
                {x} kg
              </button>
            ))}
          </div>
          <div className="mt-1.5 text-xs text-tx3">
            per week ·{" "}
            {p.goal === "lose"
              ? p.pace <= 0.5
                ? "steady and easy to stick to"
                : "faster — expect more hunger"
              : p.pace <= 0.25
                ? "lean gains, less fat"
                : "faster gains, some fat"}
          </div>
        </div>
      )}

      <div className="mt-6">
        <Label>Workouts per week</Label>
        <div className="grid grid-cols-7 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              onClick={() => set({ workoutsPerWeek: n })}
              className={clsx("rounded-xl py-2.5 text-sm font-semibold", p.workoutsPerWeek === n ? "bg-acc text-white" : "bg-surf2 text-tx2")}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlanStep({ p, onDone }: { p: Profile; onDone: () => void }) {
  const plan = useMemo(() => buildPlan(p), [p]);
  const [calories, setCalories] = useState<number | null>(plan.calories);
  const [protein, setProtein] = useState<number | null>(plan.protein);
  const [carbs, setCarbs] = useState<number | null>(plan.carbs);
  const [fat, setFat] = useState<number | null>(plan.fat);
  const [steps, setSteps] = useState<number | null>(plan.steps);
  const diff = plan.calories - plan.tdee;
  const b = bmi(p);
  const valid = [calories, protein, carbs, fat, steps].every((v) => v != null && v >= 0) && (calories ?? 0) >= 800;

  function start() {
    if (!valid) return;
    useApp.getState().completeOnboarding(p, {
      nutrition: { calories: calories!, protein: protein!, carbs: carbs!, fat: fat! },
      steps: steps!,
    });
    onDone();
  }

  return (
    <div>
      <Title sub="Based on your answers. Tweak anything you like.">{p.name ? `${p.name}, here's your plan` : "Here's your plan"}</Title>

      <div className="rounded-3xl bg-acc/10 p-5 text-center">
        <div className="text-sm font-medium text-tx2">Daily calories</div>
        <div className="mt-1 text-[44px] font-bold leading-none tabular-nums text-acc">{fmt(calories ?? 0)}</div>
        <div className="mt-2 text-sm text-tx2">
          {diff < -20 ? `${fmt(-diff)} kcal under your burn` : diff > 20 ? `${fmt(diff)} kcal above your burn` : "matches what you burn"}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <Explain label="Resting burn" value={`${fmt(plan.bmr)}`} />
          <Explain label="With activity" value={`${fmt(plan.tdee)}`} />
          <Explain label={p.goal === "maintain" ? "Goal" : p.goal === "lose" ? `−${p.pace} kg/wk` : `+${p.pace} kg/wk`} value={`${fmt(plan.calories)}`} />
        </div>
      </div>

      {plan.notes.map((n) => (
        <p key={n} className="mt-3 rounded-xl bg-gold/10 px-3 py-2 text-sm text-gold">
          {n}
        </p>
      ))}

      <div className="mt-5 space-y-3 rounded-2xl bg-surf p-4">
        <Row icon={<Target size={18} />} label="Calories" hint="kcal / day">
          <NumberInput value={calories} onChange={(v) => setCalories(v == null ? null : Math.round(v))} step="1" />
        </Row>
        <Row icon={<Trophy size={18} />} label="Protein" hint={`${(protein && p.weightKg ? protein / p.weightKg : 0).toFixed(1)} g per kg`}>
          <NumberInput value={protein} onChange={(v) => setProtein(v == null ? null : Math.round(v))} suffix="g" step="1" />
        </Row>
        <Row icon={<Utensils size={18} />} label="Carbs" hint="the rest of your energy">
          <NumberInput value={carbs} onChange={(v) => setCarbs(v == null ? null : Math.round(v))} suffix="g" step="1" />
        </Row>
        <Row icon={<Flame size={18} />} label="Fat" hint="~27% of calories">
          <NumberInput value={fat} onChange={(v) => setFat(v == null ? null : Math.round(v))} suffix="g" step="1" />
        </Row>
        <Row icon={<ActivityIcon size={18} />} label="Steps" hint="per day">
          <NumberInput value={steps} onChange={(v) => setSteps(v == null ? null : Math.round(v))} step="1" />
        </Row>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-tx3">
        BMI {b.toFixed(1)}. Calories use the Mifflin–St Jeor equation; protein is set at {p.goal === "lose" ? "2.0" : p.goal === "gain" ? "1.8" : "1.6"} g per kg
        of body weight. These are estimates — watch your weight for 2–3 weeks and adjust. Not medical advice; if you have a health condition, check
        with a doctor or dietitian.
      </p>

      <div className="pb-safe fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-bg via-bg to-transparent px-5 pt-6">
        <Button className="mb-5 h-12 w-full text-base" disabled={!valid} onClick={start}>
          Start my plan
        </Button>
      </div>
    </div>
  );
}

function Explain({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg/40 px-2 py-2">
      <div className="font-semibold tabular-nums text-tx">{value}</div>
      <div className="text-tx3">{label}</div>
    </div>
  );
}

function Row({ icon, label, hint, children }: { icon: ReactNode; label: string; hint: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_8rem] items-center gap-3">
      <div className="flex items-center gap-3">
        <span className="text-tx3">{icon}</span>
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-xs text-tx3">{hint}</div>
        </div>
      </div>
      {children}
    </div>
  );
}
