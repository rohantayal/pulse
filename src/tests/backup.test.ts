import { describe, expect, it } from "vitest";
import { describeBackup, makeBackup, parseBackup } from "../lib/backup";

describe("backup", () => {
  const state = {
    foodLog: [{ date: "2026-10-01" }, { date: "2026-10-01" }, { date: "2026-10-02" }],
    workouts: [{ id: "w" }],
    routines: [],
    customFoods: [],
    unit: "lb",
    selectedDate: "2026-10-09", // UI state — not saved
    setUnit: () => {}, // functions — not saved
  };

  it("round-trips the data and drops UI state", () => {
    const b = makeBackup(state, new Date("2026-10-09T10:00:00Z"));
    const back = parseBackup(JSON.stringify(b));
    expect(back.data.foodLog).toEqual(state.foodLog);
    expect(back.data.unit).toBe("lb");
    expect("selectedDate" in back.data).toBe(false);
    expect("setUnit" in back.data).toBe(false);
    expect(describeBackup(back)).toMatch(/^1 workout, 2 days of food, 0 routines/);
  });

  it("rejects files that aren't Pulse backups", () => {
    expect(() => parseBackup("not json")).toThrow(/not valid JSON/);
    expect(() => parseBackup(JSON.stringify({ hello: 1 }))).toThrow(/isn't a Pulse backup/);
    expect(() => parseBackup(JSON.stringify({ app: "pulse", version: 2, data: {} }))).toThrow(/newer version/);
    expect(() => parseBackup(JSON.stringify({ app: "pulse", version: 1, data: { foodLog: "x" } }))).toThrow(/damaged/);
  });
});
