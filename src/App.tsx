import { useEffect, useState } from "react";
import { Apple, BarChart3, UserRound, CalendarCheck, ClipboardList, Dumbbell, Footprints, History, Plus, Scale, Target, Utensils, X } from "lucide-react";
import clsx from "clsx";
import { useApp } from "./store/app";
import { useUi, type Page, type Tab } from "./store/ui";
import { formatDuration, todayKey } from "./lib/date";
import { Home } from "./screens/Home";
import { HistoryPage, WorkoutDetail } from "./screens/History";
import { RoutineEditor, RoutinesPage } from "./screens/Routines";
import { FoodEditor, MyFoods } from "./screens/MyFoods";
import { LogFood } from "./screens/LogFood";
import { ActiveWorkout } from "./screens/ActiveWorkout";
import { ExerciseGoalsPage, ExerciseWeeklyPage, NutritionGoalsPage, NutritionWeeklyPage, StepsPage, WeightPage } from "./screens/MenuPages";
import { useStartWorkout } from "./screens/startWorkout";
import { Onboarding } from "./screens/Onboarding";
import { Sheet } from "./components/ui";
import type { Meal } from "./types";

export default function App() {
  const tab = useUi((s) => s.tab);
  const stack = useUi((s) => s.stack);
  const workoutOpen = useUi((s) => s.workoutOpen);
  const toast = useUi((s) => s.toast);
  const active = useApp((s) => s.active);
  // First launch: nothing set up and nothing logged yet. People who already use the app can
  // open the same setup from Menu → Set up my plan.
  const firstRun = useApp((s) => !s.onboarded && s.foodLog.length === 0 && s.workouts.length === 0);

  // Android/browser back button closes the top page instead of leaving the app.
  useEffect(() => {
    const onPop = () => {
      const ui = useUi.getState();
      if (ui.addOpen) ui.setAdd(false);
      else if (ui.menuOpen) ui.setMenu(false);
      else if (ui.stack.length) ui.pop();
      else if (ui.workoutOpen) ui.setWorkoutOpen(false);
      else return;
      history.pushState(null, "");
    };
    history.pushState(null, "");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <div className="mx-auto h-full max-w-md">
      <main className="no-scrollbar h-full overflow-y-auto">
        {tab === "today" && <Home />}
        {tab === "history" && <HistoryPage />}
        {tab === "routines" && <RoutinesPage />}
        {tab === "foods" && <MyFoods />}
      </main>

      {active && !workoutOpen && <WorkoutBar />}
      <BottomNav />
      <AddSheet />
      <MenuDrawer />

      {/* Every page in the stack stays mounted (so e.g. Log food keeps what you typed while you
          create a food), each on its own layer so nothing from a lower page shows through. */}
      {stack.map((p, i) => (
        <div key={i} className="relative" style={{ zIndex: 30 + i }}>
          <PageView page={p} />
        </div>
      ))}
      {active && workoutOpen && <ActiveWorkout />}

      {firstRun && <Onboarding onDone={() => useUi.getState().showToast("You're all set — log your first meal!")} />}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[90] flex justify-center">
          <div className="rounded-full bg-surf3 px-4 py-2 text-sm font-medium shadow-lg animate-fade-in">{toast}</div>
        </div>
      )}
    </div>
  );
}

function PageView({ page }: { page: Page }) {
  switch (page.kind) {
    case "logFood":
      return <LogFood meal={page.meal} date={page.date} />;
    case "foodEditor":
      return <FoodEditor foodId={page.foodId} name={page.name} />;
    case "routineEditor":
      return <RoutineEditor routineId={page.routineId} />;
    case "workoutDetail":
      return <WorkoutDetail workoutId={page.workoutId} />;
    case "nutritionGoals":
      return <NutritionGoalsPage />;
    case "nutritionWeekly":
      return <NutritionWeeklyPage />;
    case "weight":
      return <WeightPage />;
    case "exerciseGoals":
      return <ExerciseGoalsPage />;
    case "exerciseWeekly":
      return <ExerciseWeeklyPage />;
    case "steps":
      return <StepsPage />;
    case "onboarding":
      return (
        <Onboarding
          onCancel={() => useUi.getState().pop()}
          onDone={() => {
            useUi.getState().pop();
            useUi.getState().showToast("Plan updated");
          }}
        />
      );
  }
}

const TABS: { id: Exclude<Tab, "today">; label: string; icon: typeof History }[] = [
  { id: "history", label: "Previous", icon: History },
  { id: "routines", label: "Routines", icon: ClipboardList },
  { id: "foods", label: "My Foods", icon: Apple },
];

function BottomNav() {
  const tab = useUi((s) => s.tab);
  const setTab = useUi((s) => s.setTab);
  const setAdd = useUi((s) => s.setAdd);
  const setDate = useApp((s) => s.setDate);

  const item = (id: Exclude<Tab, "today">) => {
    const t = TABS.find((x) => x.id === id)!;
    const Icon = t.icon;
    const on = tab === id;
    return (
      <button key={id} onClick={() => setTab(id)} className={clsx("flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium", on ? "text-tx" : "text-tx3")}>
        <Icon size={22} strokeWidth={on ? 2.4 : 1.8} />
        {t.label}
      </button>
    );
  };

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-line bg-bg/95 backdrop-blur">
      <div className="flex h-16 items-center gap-1 px-2">
        {item("history")}
        {item("routines")}
        <button
          onClick={() => {
            if (tab === "today") setDate(todayKey());
            setTab("today");
          }}
          className={clsx(
            "flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition",
            tab === "today" ? "bg-acc text-white" : "bg-surf2 text-tx2",
          )}
        >
          <CalendarCheck size={18} />
          Today
        </button>
        {item("foods")}
        <button
          onClick={() => setAdd(true)}
          aria-label="Add"
          className="ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tx text-bg shadow-lg active:scale-95"
        >
          <Plus size={24} strokeWidth={2.6} />
        </button>
      </div>
    </nav>
  );
}

function AddSheet() {
  const open = useUi((s) => s.addOpen);
  const { setAdd, push } = useUi();
  const routines = useApp((s) => s.routines);
  const meals = useApp((s) => s.meals);
  const date = useApp((s) => s.selectedDate);
  const active = useApp((s) => s.active);
  const start = useStartWorkout();
  const [mode, setMode] = useState<"choose" | "workout" | "food">("choose");
  const close = () => {
    setAdd(false);
    setMode("choose");
  };

  const suggestedMeal = ((): Meal => {
    const h = new Date().getHours();
    if (h < 11) return "breakfast";
    if (h < 16) return "lunch";
    if (h < 21) return "dinner";
    return "snacks";
  })();

  return (
    <Sheet open={open} onClose={close} title={mode === "choose" ? "Add" : mode === "workout" ? "Start a workout" : "Log food"}>
      {mode === "choose" && (
        <div className="grid grid-cols-2 gap-3">
          <BigChoice icon={<Dumbbell size={28} />} label="Workout" sub={active ? "Resume current" : "Routine or empty"} color="#3987e5" onClick={() => (active ? start() : setMode("workout"))} />
          <BigChoice icon={<Utensils size={28} />} label="Food" sub="Log a meal" color="#3fb96b" onClick={() => setMode("food")} />
        </div>
      )}
      {mode === "workout" && (
        <div className="space-y-2">
          <button onClick={() => { start(); setMode("choose"); }} className="flex w-full items-center gap-3 rounded-2xl bg-acc p-4 text-left font-semibold text-white">
            <Plus size={20} /> Start empty workout
          </button>
          {routines.map((r) => (
            <button
              key={r.id}
              disabled={r.exercises.length === 0}
              onClick={() => {
                start(r);
                setMode("choose");
              }}
              className="flex w-full items-center gap-3 rounded-2xl bg-surf2 p-4 text-left active:bg-surf3 disabled:opacity-40"
            >
              <ClipboardList size={20} className="text-acc" />
              <div className="flex-1">
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-tx2">{r.exercises.length} exercises</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {mode === "food" && (
        <div className="grid grid-cols-2 gap-2">
          {meals.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                push({ kind: "logFood", meal: m.id, date });
                setMode("choose");
              }}
              className={clsx("rounded-2xl p-4 text-left font-semibold active:bg-surf3", m.id === suggestedMeal ? "bg-good/15 text-good" : "bg-surf2")}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

function BigChoice({ icon, label, sub, color, onClick }: { icon: React.ReactNode; label: string; sub: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 rounded-2xl bg-surf2 px-3 py-6 active:bg-surf3">
      <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: `${color}26`, color }}>
        {icon}
      </div>
      <div className="text-[16px] font-semibold">{label}</div>
      <div className="text-xs text-tx2">{sub}</div>
    </button>
  );
}

function MenuDrawer() {
  const open = useUi((s) => s.menuOpen);
  const { setMenu, push } = useUi();
  const name = useApp((s) => s.profile?.name);
  if (!open) return null;
  const Item = ({ icon, label, page }: { icon: React.ReactNode; label: string; page: Page }) => (
    <button onClick={() => push(page)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-medium active:bg-surf2">
      <span className="text-tx2">{icon}</span>
      {label}
    </button>
  );
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={() => setMenu(false)} />
      <aside className="pt-safe absolute inset-y-0 left-0 w-[80%] max-w-xs overflow-y-auto bg-surf animate-slide-right">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-xl font-bold">Pulse</div>
            {name && <div className="text-sm text-tx2">Hi, {name}</div>}
          </div>
          <button onClick={() => setMenu(false)} className="rounded-full p-1.5 text-tx2 active:bg-surf2" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <div className="px-2">
          <Item icon={<UserRound size={20} />} label="Set up my plan" page={{ kind: "onboarding" }} />

          <div className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-good">Nutrition</div>
          <Item icon={<Target size={20} />} label="Daily goals" page={{ kind: "nutritionGoals" }} />
          <Item icon={<BarChart3 size={20} />} label="Weekly summary" page={{ kind: "nutritionWeekly" }} />
          <Item icon={<Scale size={20} />} label="Weight tracker" page={{ kind: "weight" }} />

          <div className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-acc">Exercise</div>
          <Item icon={<Target size={20} />} label="Daily goals" page={{ kind: "exerciseGoals" }} />
          <Item icon={<BarChart3 size={20} />} label="Weekly summary" page={{ kind: "exerciseWeekly" }} />
          <Item icon={<Footprints size={20} />} label="Step tracker" page={{ kind: "steps" }} />
        </div>
        <p className="px-5 pb-6 pt-8 text-xs text-tx3">All data is stored on this device.</p>
      </aside>
    </div>
  );
}

function WorkoutBar() {
  const active = useApp((s) => s.active)!;
  const setWorkoutOpen = useUi((s) => s.setWorkoutOpen);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <button
      onClick={() => setWorkoutOpen(true)}
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-md items-center gap-3 border-t border-line bg-surf px-4 py-2.5 text-left"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acc opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-acc" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{active.name}</div>
        <div className="text-xs text-tx2">Workout in progress · {formatDuration(now - active.startedAt)}</div>
      </div>
      <span className="text-sm font-semibold text-acc">Resume</span>
    </button>
  );
}
