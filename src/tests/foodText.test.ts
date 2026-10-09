import { describe, expect, it } from "vitest";
import { PRELOADED_FOODS } from "../data/foods";
import { bestMatch, gramsPerServing, parseFoodText, parsePart } from "../lib/foodText";

const match = (q: string) => bestMatch(q, PRELOADED_FOODS)?.name ?? null;

describe("parsePart", () => {
  it.each([
    ["2 roti", 2, "serving", "roti"],
    ["roti", 1, "serving", "roti"],
    ["1 bowl dal tadka", 1, "serving", "dal tadka"],
    ["150g paneer", 150, "g", "paneer"],
    ["paneer 150 gm", 150, "g", "paneer"],
    ["half plate biryani", 0.5, "serving", "biryani"],
    ["1/2 cup rice", 0.5, "serving", "rice"],
    ["1 1/2 cup rice", 1.5, "serving", "rice"],
    ["an apple", 1, "serving", "apple"],
    ["two eggs", 2, "serving", "eggs"],
    ["roti x3", 3, "serving", "roti"],
    ["0.5 kg chicken breast", 500, "g", "chicken breast"],
    ["250 ml milk", 250, "g", "milk"],
  ])("%s", (raw, qty, unit, query) => {
    const p = parsePart(raw);
    expect(p.qty).toBeCloseTo(qty);
    expect(p.unit).toBe(unit);
    expect(p.query).toBe(query);
  });
});

describe("parseFoodText", () => {
  it("splits on commas, 'and', '+', newlines", () => {
    const parts = parseFoodText("2 roti, 1 bowl dal and 150g paneer + banana\nchai");
    expect(parts.map((p) => p.query)).toEqual(["roti", "dal", "paneer", "banana", "chai"]);
  });
});

describe("matching the built-in foods", () => {
  it.each([
    ["roti", "Roti / Chapati"],
    ["chapati", "Roti / Chapati"],
    ["eggs", "Egg (whole, boiled)"],
    ["egg white", "Egg White"],
    ["dal", "Dal Tadka"],
    ["dal makhani", "Dal Makhani"],
    ["rice", "White Rice (cooked)"],
    ["brown rice", "Brown Rice (cooked)"],
    ["paneer", "Paneer"],
    ["paneer butter masala", "Paneer Butter Masala"],
    ["milk", "Milk (full cream)"],
    ["dahi", "Curd / Dahi"],
    ["chai", "Masala Chai (with sugar)"],
    ["banana", "Banana"],
    ["bananas", "Banana"],
    ["chiken breast", "Chicken Breast (cooked)"],
    ["oats", "Rolled Oats (dry)"],
    ["whey protein", "Whey Protein"],
    ["masala dosa", "Masala Dosa"],
  ])("%s → %s", (q, expected) => {
    expect(match(q)).toBe(expected);
  });

  it("returns null when nothing matches", () => {
    expect(match("grandma's secret casserole")).toBeNull();
    expect(match("xyzzy")).toBeNull();
  });
});

describe("gramsPerServing", () => {
  it("reads the weight out of the serving text", () => {
    expect(gramsPerServing({ serving: "1 medium (40 g)" })).toBe(40);
    expect(gramsPerServing({ serving: "100 g" })).toBe(100);
    expect(gramsPerServing({ serving: "1 can (330 ml)" })).toBe(330);
    expect(gramsPerServing({ serving: "1 omelette" })).toBeUndefined();
    expect(gramsPerServing({ serving: "1 omelette", grams: 120 })).toBe(120);
  });
});
