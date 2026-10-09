# Pulse – Fitness & Nutrition

A mobile-first workout tracker (Hevy-style) and calorie counter (Journable-style) in one app.
Standalone Vite + React + TypeScript + Tailwind + Zustand project, independent of StockFlow.
All data is stored in the browser's `localStorage` (key `pulse-app-v1`).

```bash
cd wellness
npm install
npm run dev        # open the printed URL on your phone (same Wi-Fi) or in a mobile-sized browser window
npm test           # PR detection / date logic tests
npm run build      # typecheck + production build
```

## What's in it

**Today (home)**
- Top bar: menu · date (tap for a month calendar) · share (shares/copies the day's summary)
- Week strip (Mon–Sun). Swipe the strip to change week, swipe the page to change day.
- Calories card: Food · Exercise · Remaining (Remaining = Goal − Food + Exercise)
- Macros card: Carbs · Protein · Fat as now/goal g with progress bars
- Breakfast / Lunch / Dinner / Snacks with logged foods (tap to edit servings/meal or delete)
- Exercise: the day's workouts (calories burned) and steps; body weight

**Bottom bar:** Previous workouts · Workout routines · **Today** (pill) · My Foods · **+** (Workout or Food)

**Menu**
- Nutrition: Daily goals (calories + macros, with presets) · Weekly summary · Weight tracker
- Exercise: Daily goals (calories, minutes, workouts/week, steps) · Weekly summary · Step tracker

**Workouts**
- Routines: create/edit/delete, set count and rep range per exercise, start with one tap (3 sample routines are seeded)
- Live workout: Duration · Volume · Sets header; per exercise a SET | PREVIOUS | KG | REPS | ✓ table.
  KG/REPS placeholders show what you did last time; tapping PREVIOUS copies it; ticking an empty set uses it.
- + Add set, + Add exercise (65 preloaded exercises + your own), replace/reorder/remove, rest timer,
  Settings, Discard workout, Finish (calorie estimate you can edit).
- New personal records (heaviest weight, best est. 1RM, best set volume, most reps for body-weight moves)
  trigger a golden trophy and a chime. PRs are only awarded once an exercise has history.
- Previous workouts: history grouped by month, detail view, save as routine, delete.

**Nutrition**
- ~120 preloaded foods (Indian staples, proteins, dairy, grains, fruit, veg, snacks, drinks) with per-serving macros
- Create/edit/delete your own foods; recent foods list; search
