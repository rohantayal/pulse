import { useMemo, useState, type ReactNode } from "react";
import { Activity as ActivityIcon, Check, ChevronLeft, Dumbbell, Flame, PieChart, Target, Trophy, Utensils } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store/app";
import { buildPlan, type Profile, type Sex } from "../lib/plan";
import { fmt } from "../lib/format";
import { fromUnit, toUnit } from "../lib/units";
import { Button, NumberInput, inputCls } from "../components/ui";

// Kept deliberately short: only what the app needs to set your targets — no judging questions.
type Step = "welcome" | "about" | "plan" | "done";
const STEPS: Step[] = ["welcome", "about", "plan", "done"];

const DEFAULT: Profile = { sex: "male", age: 25, heightCm: 170, weightKg: 70, activity: "light", goal: "maintain", pace: 0.5, workoutsPerWeek: 3 };

/**
 * First-run setup: Welcome → About you → Your plan → Done.
 * The plan is a plain estimate of what your body uses in a day (lightly active, maintain);
 * everything on it is editable, and goals can be changed later in Menu → Daily goals.
 */
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
  const full: Profile = { ...p, age: age ?? p.age, weightKg: weight ?? p.weightKg, heightCm: heightCm ?? p.heightCm, activity: "light", goal: "maintain" };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg animate-fade-in">
      <div className="mx-auto flex h-full w-full max-w-md flex-col">
        {step !== "welcome" && step !== "done" && (
          <header className="pt-safe">
            <div className="flex h-14 items-center gap-2 px-2">
              <button onClick={back} className="flex h-10 w-10 items-center justify-center rounded-full active:bg-surf2" aria-label="Back">
                <ChevronLeft size={24} />
              </button>
              <div className="flex flex-1 gap-1.5 pr-4">
                {STEPS.slice(1, -1).map((s, idx) => (
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
          {step === "plan" && <PlanStep p={full} onSaved={next} />}
          {step === "done" && <DoneStep name={full.name} onDone={onDone} />}
        </div>

        {(step === "welcome" || step === "about") && (
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
    { icon: <PieChart size={20} />, title: "Your day at a glance", text: "Calories and macros, meal by meal." },
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
      <p className="mt-3 text-[16px] text-tx2">Pulse brings your workouts and your nutrition into one place. Three quick questions and you're in.</p>
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
  const unit = useApp((s) => s.unit);
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
        <div className="grid grid-cols-2 items-end gap-3">
          <div>
            <Label>Age</Label>
            <NumberInput value={age} onChange={(v) => setAge(v == null ? null : Math.round(v))} suffix="yrs" step="1" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>Weight</Label>
              <div className="mb-2 flex rounded-lg bg-surf2 p-0.5 text-xs font-medium">
                {(["kg", "lb"] as const).map((u) => (
                  <button key={u} onClick={() => useApp.getState().setUnit(u)} className={clsx("rounded-md px-2 py-1", unit === u ? "bg-surf3 text-tx" : "text-tx2")}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
            {/* Stored in kg; shown and typed in the chosen unit */}
            <NumberInput value={weight == null ? null : toUnit(weight, unit)} onChange={(v) => setWeight(v == null ? null : fromUnit(v, unit))} suffix={unit} />
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

function PlanStep({ p, onSaved }: { p: Profile; onSaved: () => void }) {
  const plan = useMemo(() => buildPlan(p), [p]);
  const [calories, setCalories] = useState<number | null>(plan.calories);
  const [protein, setProtein] = useState<number | null>(plan.protein);
  const [carbs, setCarbs] = useState<number | null>(plan.carbs);
  const [fat, setFat] = useState<number | null>(plan.fat);
  const [steps, setSteps] = useState<number | null>(plan.steps);
  const valid = [calories, protein, carbs, fat, steps].every((v) => v != null && v >= 0) && (calories ?? 0) >= 800;

  function save() {
    if (!valid) return;
    useApp.getState().completeOnboarding(p, {
      nutrition: { calories: calories!, protein: protein!, carbs: carbs!, fat: fat! },
      steps: steps!,
    });
    onSaved();
  }

  return (
    <div>
      <Title sub="What your body uses in a typical day. Change anything you like.">{p.name ? `${p.name}, your plan` : "Your plan"}</Title>

      <div className="rounded-3xl bg-acc/10 p-5 text-center">
        <div className="text-sm font-medium text-tx2">Daily calories</div>
        <div className="mt-1 text-[44px] font-bold leading-none tabular-nums text-acc">{fmt(calories ?? 0)}</div>
        <div className="mt-2 text-sm text-tx2">Based on your age, height and weight</div>
      </div>

      <div className="mt-5 space-y-3 rounded-2xl bg-surf p-4">
        <Row icon={<Target size={18} />} label="Calories" hint="kcal / day">
          <NumberInput value={calories} onChange={(v) => setCalories(v == null ? null : Math.round(v))} step="1" />
        </Row>
        <Row icon={<Trophy size={18} />} label="Protein" hint="g / day">
          <NumberInput value={protein} onChange={(v) => setProtein(v == null ? null : Math.round(v))} suffix="g" step="1" />
        </Row>
        <Row icon={<Utensils size={18} />} label="Carbs" hint="g / day">
          <NumberInput value={carbs} onChange={(v) => setCarbs(v == null ? null : Math.round(v))} suffix="g" step="1" />
        </Row>
        <Row icon={<Flame size={18} />} label="Fat" hint="g / day">
          <NumberInput value={fat} onChange={(v) => setFat(v == null ? null : Math.round(v))} suffix="g" step="1" />
        </Row>
        <Row icon={<ActivityIcon size={18} />} label="Steps" hint="per day">
          <NumberInput value={steps} onChange={(v) => setSteps(v == null ? null : Math.round(v))} step="1" />
        </Row>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-tx3">A starting point, not a rule. You can change these any time in Menu → Daily goals.</p>

      <div className="pb-safe fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-bg via-bg to-transparent px-5 pt-6">
        <Button className="mb-5 h-12 w-full text-base" disabled={!valid} onClick={save}>
          Continue
        </Button>
      </div>
    </div>
  );
}

function DoneStep({ name, onDone }: { name?: string; onDone: () => void }) {
  return (
    <div className="pt-safe flex min-h-full flex-col items-center justify-center py-10 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-good/15 text-good animate-pr-pop">
        <Check size={40} strokeWidth={3} />
      </div>
      <h1 className="mt-6 text-[28px] font-bold">{name ? `You're all set, ${name}` : "You're all set"}</h1>
      <p className="mt-2 text-[15px] text-tx2">Log a meal by typing what you ate, or tap + to start a workout.</p>
      <div className="pb-safe fixed inset-x-0 bottom-0 mx-auto max-w-md px-5">
        <Button className="mb-5 h-12 w-full text-base" onClick={onDone}>
          Let's go
        </Button>
      </div>
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
