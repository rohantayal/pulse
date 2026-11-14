import { describe, expect, it } from "vitest";
import type { Habit, Reminders } from "../types";
import { planReminders } from "../lib/reminders";
import { addDays, todayKey } from "../lib/date";

const off = { on: false, time: "10:00" };
const base: Reminders = { meals: { breakfast: off, lunch: off, dinner: off }, habits: off };
const goals = { calories: 2000, carbs: 200, protein: 150, fat: 70, overAllowance: 100 };
const input = (reminders: Reminders, extra: Partial<Parameters<typeof planReminders>[0]> = {}) => ({
  reminders,
  foodLog: [],
  habits: [],
  habitLog: {},
  day: { foodLog: [], workouts: [], goals },
  ...extra,
});
const morning = () => {
  const d = new Date();
  d.setHours(6, 0, 0, 0);
  return d;
};

describe("planReminders", () => {
  it("plans a week of meal reminders with stable ids", () => {
    const r = { ...base, meals: { ...base.meals, lunch: { on: true, time: "13:00" } } };
    const plan = planReminders(input(r), morning());
    expect(plan).toHaveLength(7);
    expect(plan[0].id).toBe(5001);
    expect(plan[0].at.getHours()).toBe(13);
    expect(plan[6].extra.date).toBe(addDays(todayKey(), 6));
  });

  it("skips today's reminder once that meal is logged", () => {
    const r = { ...base, meals: { ...base.meals, lunch: { on: true, time: "13:00" } } };
    const plan = planReminders(input(r, { foodLog: [{ date: todayKey(), meal: "lunch" }] }), morning());
    expect(plan).toHaveLength(6);
    expect(plan[0].extra.date).toBe(addDays(todayKey(), 1));
  });

  it("only nudges habits when some are still open", () => {
    const h: Habit = { id: "h", name: "Read", target: 1, days: [], createdAt: 0 };
    const r = { ...base, habits: { on: true, time: "20:00" } };
    expect(planReminders(input(r), morning())).toHaveLength(0); // no habits at all
    const open = planReminders(input(r, { habits: [h] }), morning());
    expect(open[0].body).toMatch(/1 habit left/);
    const done = planReminders(input(r, { habits: [h], habitLog: { [todayKey()]: { h: 1 } } }), morning());
    expect(done[0].extra.date).toBe(addDays(todayKey(), 1));
  });
});
