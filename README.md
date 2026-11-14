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

## Install on Android

Every push to `main` builds a signed APK (GitHub Actions → "Android APK") and publishes it under
**Releases**. On your phone: open the repo's Releases page, download the newest `pulse-1.0.N.apk` and
open it (allow "install unknown apps" for your browser the first time). New builds install over the old
one and keep your data. Requires Android 8.0+.

**Your data on Android** lives inside the app (native storage):
- Android Auto Backup copies it to your Google Drive (roughly daily, on Wi-Fi while charging) and puts it
  back automatically when you reinstall — make sure *Settings → Google → Backup* is on.
- Settings → Backup → **Export** saves a file (share it to Drive/WhatsApp/Files) and **Restore** loads one.
  Use this before uninstalling or switching phones; it's instant and doesn't depend on Google's schedule.

**Signing:** `android/app/pulse.keystore` is committed so every CI build can update the installed app. If
the repo ever becomes public or you publish to the Play Store, create a new key, keep it out of git, and
pass it via the `PULSE_KEYSTORE*` environment variables (see `android/app/build.gradle`).

Local Android builds need Android Studio / the Android SDK: `npm run build && npx cap sync android`, then
open `android/` in Android Studio.

## What's in it

**First launch:** Welcome → About you (sex, age, height, weight, kg/lb) → Your plan (calories and macros,
estimated with Mifflin–St Jeor; editing calories rescales the macros and editing a macro updates calories, so
they always match) → Build your first routine (templates, create your own, or skip) → Done.
Re-run any time from Settings → Set up my plan again.

**Today (home)**
- Top bar: menu · date (tap for a month calendar) · share (shares/copies the day's summary)
- Week strip of day cards: green when that day stayed within goal (+ exercise + allowance), red when over.
  Swipe the strip to change week, swipe the page to change day.
- One card for Calories (Food · Exercise · Remaining) and Carbs · Protein · Fat (now/goal g)
- Meals (Breakfast / Lunch / Dinner / Snacks + your own). Each meal shows its own card: calories as % of
  the day, each macro's share of the meal, and honest feedback on that meal alone (size vs. a typical
  meal, macro balance, protein). Other meals never change it.
- Empty meal today but you ate it yesterday? A "Same as yesterday" chip copies it in one tap. The meal's
  ··· menu also has "Copy yesterday's …" and "Save as a meal".
- Swipe a food left to delete it; Undo on the toast brings it back.
- Exercise: the day's workouts; body weight; a "Getting started" checklist for new users

**Habits (on Today, under Calories)**
- Shown as one sideways-scrolling row of rings with an emoji each (picked from the name, or your choice):
  tap a ring to tick, tap the name under it (or hold the ring) to open the habit. Header shows done/due
  and a small progress bar.
- Tick habits (one tap) or count habits ("8 glasses": each tap +1, −/+ on the habit's page to correct),
  every day or on chosen days.
- Self-ticking habits that follow what you log: Work out, Hit protein goal, Log every meal, Stay within calories.
- Streaks (🔥) on each habit; tap a habit for current/best streak, last-30-days completion and a 12-week grid.
- Add from the + button or the + next to "Habits"; edit or delete from the habit's page.

**Bottom bar:** Previous workouts · Workout routines · **Today** (pill) · My Foods · **+** (Workout, Food or Habit)

**Menu**
- Settings (kg/lb, reminders, backup export/restore, set up my plan again)
- Reminders (Android notifications, all off by default): breakfast, lunch and dinner at your times —
  skipped if that meal is already logged — and one for habits, only if some are still open that day.
  Tapping a meal reminder opens Log food for that meal.
- Nutrition: Daily goals (calories & macros that always add up, over-goal allowance, optional
  lose/maintain/gain helper)
  · Weekly summary · Weight tracker
- Exercise: Daily goals (calories, minutes, workouts/week) · Weekly summary

**Workouts**
- Routines: create/edit/delete, set count and rep range per exercise, start with one tap; starter templates
  (Full Body, Push, Pull, Legs, Upper, Lower) offered in setup and on an empty Routines page
- Live workout: Duration · Volume · Sets header; per exercise a SET | BEST | KG | REPS | ✓ table.
  BEST is your lifetime best for that set position (tap to copy); the KG/REPS hints are what you did last
  time in this routine (or anywhere, if the routine has no history), and ticking an empty set uses them.
- Exercise notes: a note under each exercise's name (grip, seat height, a cue) that stays with the
  exercise and shows every time you do it; also on the exercise's ⓘ page.
- + Add set, + Add exercise (65 preloaded exercises + your own), replace/reorder/remove,
  Settings, Discard workout, Finish (calorie estimate you can edit). Swipe a set left to delete it (Undo).
- The screen stays on while a workout is open.
- Finishing shows a summary: PRs, duration/volume vs. your last session of this routine, and per exercise
  today's best set against last time ("+2.5 kg", "+1 rep", "First time"). Share sends it as text.
- New personal records (heaviest weight, best est. 1RM, best set volume, most reps for body-weight moves)
  trigger a golden trophy and a chime. PRs only count against earlier workouts: the first time you do an
  exercise there's nothing to beat, so no trophy even if set 2 beats set 1.
- Previous workouts: history grouped by month, detail view, save as routine, delete.
- Every exercise shows a small body sketch with its muscles in red (main muscles solid, helpers lighter) and
  the main muscle by name. The ⓘ next to an exercise opens its page: an animated sketch of the movement,
  front/back muscle map, a progress chart (heaviest / est. 1RM / volume, or reps for body-weight moves),
  session history, and personal records (best set, heaviest weight, best est. 1RM, best set volume, most
  reps in a session, best session volume).
- Exercise photos (start/end positions, shown alternating like a GIF) and step-by-step instructions come
  from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain), resized to WebP and
  bundled in `public/exercise-img` so they work offline (~2 MB). Custom exercises and burpees fall back to
  the muscle sketch and a simple animated stick figure.

**Nutrition**
- Log a meal by typing what you ate: `2 roti, 1 bowl dal, 150g paneer, banana`. Each part is matched
  to a food only when every word fits (Hindi names like chapati/dahi/anda and small typos work);
  otherwise you get "Create <food>" plus "Did you mean…" suggestions.
- Amounts in servings or grams (switch per item; the amount converts).
- Quick add: just calories (and macros if you know them) for when you can't look a food up.
- Saved meals show as chips above the text box: one tap logs the whole meal (long-press to delete).
- ~120 preloaded foods (Indian staples, proteins, dairy, grains, fruit, veg, snacks, drinks); create/edit your own in My Foods.
