import { describe, expect, it } from "vitest";
import { foodFromOff } from "../lib/barcode";

describe("foodFromOff", () => {
  it("uses the pack's serving when it has one", () => {
    const f = foodFromOff("8901", {
      product_name: "Masala Oats, Classic",
      brands: "Saffola,Marico",
      serving_size: "40 g",
      serving_quantity: 40,
      nutriments: { "energy-kcal_100g": 390, carbohydrates_100g: 64, proteins_100g: 11, fat_100g: 9.5 },
    })!;
    expect(f).toMatchObject({ name: "Masala Oats Classic", brand: "Saffola", serving: "40 g", grams: 40, calories: 156, carbs: 25.6, protein: 4.4, fat: 3.8, barcode: "8901" });
  });
  it("falls back to 100 g and kJ", () => {
    const f = foodFromOff("1", { product_name: "Bread and Butter Pickle", nutriments: { energy_100g: 418.4 } })!;
    expect(f.name).toBe("Bread & Butter Pickle");
    expect(f.serving).toBe("100 g");
    expect(f.calories).toBe(100);
  });
  it("returns null without energy", () => {
    expect(foodFromOff("1", { product_name: "x", nutriments: {} })).toBeNull();
  });
});
