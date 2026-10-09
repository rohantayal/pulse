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

**First launch:** Welcome → About you (sex, age, height, weight) → Your plan (calories, macros, steps —
estimated with Mifflin–St Jeor, all editable) → Done. Re-run any time from Menu → Set up my plan.

**Today (home)**
- Top bar: menu · date (tap for a month calendar) · share (shares/copies the day's summary)
- Week strip of day cards: green when that day stayed within goal (+ exercise + allowance), red when over.
  Swipe the strip to change week, swipe the page to change day.
- One card for Calories (Food · Exercise · Remaining) and Carbs · Protein · Fat (now/goal g)
- Meals (Breakfast / Lunch / Dinner / Snacks + your own). Each meal shows its own card: calories as % of
  the day, each macro's share of the meal, and honest feedback on that meal alone (size vs. a typical
  meal, macro balance, protein). Other meals never change it.
- Exercise: the day's workouts and steps; body weight; a "Getting started" checklist for new users

**Bottom bar:** Previous workouts · Workout routines · **Today** (pill) · My Foods · **+** (Workout or Food)

**Menu**
- Nutrition: Daily goals (calories, macros, over-goal allowance, optional lose/maintain/gain helper)
  · Weekly summary · Weight tracker
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
- Log a meal by typing what you ate: `2 roti, 1 bowl dal, 150g paneer, banana`. Each part is matched
  to a food only when every word fits (Hindi names like chapati/dahi/anda and small typos work);
  otherwise you get "Create <food>" plus "Did you mean…" suggestions.
- Amounts in servings or grams (switch per item; the amount converts).
- ~120 preloaded foods (Indian staples, proteins, dairy, grains, fruit, veg, snacks, drinks); create/edit your own in My Foods.
