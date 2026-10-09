/**
 * Turns a profile into daily targets.
 *
 * - Resting burn (BMR): Mifflin–St Jeor, the most accurate simple equation for adults.
 *     men:   10·kg + 6.25·cm − 5·age + 5
 *     women: 10·kg + 6.25·cm − 5·age − 161
 * - Daily burn (TDEE) = BMR × activity factor (1.2 … 1.725).
 * - Goal: ~7,700 kcal per kg of body weight, so 0.5 kg/week ≈ 550 kcal/day.
 * - Protein: 1.6 g/kg to maintain, 2.0 g/kg while losing (protects muscle), 1.8 g/kg while gaining.
 * - Fat: 27% of calories (inside the 20–35% range). Carbs: the rest.
 * Safety rails: never below 1,200 kcal (women) / 1,500 kcal (men) or BMR, loss capped at ~1% of
 * body weight per week, and no deficit for under-18s or anyone already underweight.
 */

export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "very";
export type GoalType = "lose" | "maintain" | "gain";

export interface Profile {
  name?: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: GoalType;
  /** kg per week (positive number); ignored for maintain */
  pace: number;
  workoutsPerWeek: number;
}

export const ACTIVITY: Record<Activity, { label: string; hint: string; factor: number; steps: number }> = {
  sedentary: { label: "Mostly sitting", hint: "Desk job, little walking", factor: 1.2, steps: 6000 },
  light: { label: "Lightly active", hint: "On your feet some of the day, short walks", factor: 1.375, steps: 8000 },
  moderate: { label: "Active", hint: "On your feet most of the day, or a physical job", factor: 1.55, steps: 10000 },
  very: { label: "Very active", hint: "Hard physical work or training most days", factor: 1.725, steps: 12000 },
};

export const KCAL_PER_KG = 7700;

export function bmr(p: Pick<Profile, "sex" | "age" | "heightCm" | "weightKg">): number {
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === "male" ? 5 : -161);
}

export function tdee(p: Pick<Profile, "sex" | "age" | "heightCm" | "weightKg" | "activity">): number {
  return bmr(p) * ACTIVITY[p.activity].factor;
}

export function bmi(p: Pick<Profile, "heightCm" | "weightKg">): number {
  const m = p.heightCm / 100;
  return m > 0 ? p.weightKg / (m * m) : 0;
}

/** Why a goal isn't offered, or null if it's fine. */
export function goalBlocked(goal: GoalType, p: Pick<Profile, "age" | "heightCm" | "weightKg">): string | null {
  if (goal !== "lose") return null;
  if (p.age < 18) return "Under 18 we don't set a calorie deficit — talk to a doctor or dietitian first.";
  if (bmi(p) < 18.5) return "Your BMI is already below the healthy range, so we won't plan weight loss.";
  return null;
}

/** Fastest pace we'll plan for, kg/week. */
export function maxPace(goal: GoalType, weightKg: number): number {
  if (goal === "lose") return Math.max(0.25, Math.min(1, Math.floor(weightKg * 0.01 * 4) / 4));
  if (goal === "gain") return 0.5;
  return 0;
}

export interface Plan {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  steps: number;
  /** Notes about adjustments the safety rails made */
  notes: string[];
}

const round5 = (n: number) => Math.round(n / 5) * 5;

export function buildPlan(p: Profile): Plan {
  const notes: string[] = [];
  const base = bmr(p);
  const burn = tdee(p);
  let goal = p.goal;
  const blocked = goalBlocked(goal, p);
  if (blocked) {
    notes.push(blocked);
    goal = "maintain";
  }
  let pace = goal === "maintain" ? 0 : Math.min(p.pace, maxPace(goal, p.weightKg));
  if (goal !== "maintain" && pace < p.pace) notes.push(`Pace limited to ${pace} kg/week to keep it safe and sustainable.`);
  const daily = (pace * KCAL_PER_KG) / 7;
  let calories = goal === "lose" ? burn - daily : goal === "gain" ? burn + daily : burn;

  const floor = Math.max(p.sex === "male" ? 1500 : 1200, base);
  if (calories < floor) {
    notes.push(`Raised to ${round5(floor)} kcal — eating less than that makes it hard to get enough nutrients.`);
    calories = floor;
  }
  calories = round5(calories);

  const proteinPerKg = goal === "lose" ? 2.0 : goal === "gain" ? 1.8 : 1.6;
  const protein = Math.round(p.weightKg * proteinPerKg);
  const fat = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  return { bmr: Math.round(base), tdee: Math.round(burn), calories, protein, carbs, fat, steps: ACTIVITY[p.activity].steps, notes };
}
