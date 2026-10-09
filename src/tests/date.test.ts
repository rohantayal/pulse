import { describe, expect, it } from "vitest";
import { addDays, friendlyDate, weekDays, weekStart } from "../lib/date";

describe("dates", () => {
  it("weeks start on Monday", () => {
    expect(weekStart("2026-10-09")).toBe("2026-10-05"); // Fri -> Mon
    expect(weekStart("2026-10-11")).toBe("2026-10-05"); // Sun -> Mon
    expect(weekDays("2026-10-09")).toHaveLength(7);
  });
  it("adds days across month boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("labels relative days", () => {
    expect(friendlyDate("2026-10-09", "2026-10-09")).toBe("Today");
    expect(friendlyDate("2026-10-08", "2026-10-09")).toBe("Yesterday");
    expect(friendlyDate("2026-10-06", "2026-10-09")).toBe("Tue, 6 Oct");
  });
});
