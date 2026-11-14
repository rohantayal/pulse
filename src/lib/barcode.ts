import { CapacitorHttp } from "@capacitor/core";
import { BarcodeFormat, BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";
import type { Food } from "../types";
import { isNative } from "./platform";

export class ScanError extends Error {}

/**
 * Open Google's barcode scanner (no camera permission needed — Play services shows the camera).
 * Resolves the barcode digits, or null if cancelled.
 */
export async function scanBarcode(): Promise<string | null> {
  if (!isNative) throw new ScanError("Scanning works in the Android app");
  const { supported } = await BarcodeScanner.isSupported();
  if (!supported) throw new ScanError("This phone can't scan barcodes");
  const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (!available) {
    await BarcodeScanner.installGoogleBarcodeScannerModule().catch(() => {});
    throw new ScanError("Setting up the scanner — try again in a moment");
  }
  try {
    const { barcodes } = await BarcodeScanner.scan({
      formats: [BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE],
    });
    return barcodes[0]?.rawValue ?? null;
  } catch {
    return null; // closed without scanning
  }
}

interface OffProduct {
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
}

const num = (v: unknown) => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
};
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Our Food from an Open Food Facts product: per serving when the pack says one, else per 100 g. */
export function foodFromOff(code: string, p: OffProduct): Omit<Food, "id"> | null {
  const n = p.nutriments ?? {};
  const kcal100 = num(n["energy-kcal_100g"]) ?? (num(n["energy_100g"]) != null ? num(n["energy_100g"])! / 4.184 : undefined);
  if (kcal100 == null) return null;
  const per100 = {
    calories: kcal100,
    carbs: num(n["carbohydrates_100g"]) ?? 0,
    protein: num(n["proteins_100g"]) ?? 0,
    fat: num(n["fat_100g"]) ?? 0,
  };
  const servingG = num(p.serving_quantity);
  const g = servingG && servingG > 0 && servingG < 2000 ? servingG : 100;
  const k = g / 100;
  // names feed the text box, so keep them free of the separators the parser splits on
  const rawName = (p.product_name_en || p.product_name || "Scanned food").trim();
  const name = rawName.replace(/,/g, " ").replace(/\s+and\s+/gi, " & ").replace(/\s+/g, " ").slice(0, 60);
  const brand = p.brands?.split(",")[0]?.trim() || undefined;
  return {
    name,
    brand,
    serving: g === 100 && !servingG ? "100 g" : `${p.serving_size?.trim() || "1 serving"}${/\d\s*g\b/i.test(p.serving_size ?? "") ? "" : ` (${r1(g)} g)`}`,
    grams: r1(g),
    calories: Math.round(per100.calories * k),
    carbs: r1(per100.carbs * k),
    protein: r1(per100.protein * k),
    fat: r1(per100.fat * k),
    custom: true,
    barcode: code,
  };
}

/** Look a barcode up on Open Food Facts (free, open data). Null when it isn't there. */
export async function lookupBarcode(code: string): Promise<Omit<Food, "id"> | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_en,brands,serving_size,serving_quantity,nutriments`;
  let status: number;
  let body: { status?: number; product?: OffProduct };
  try {
    if (isNative) {
      // native HTTP: no browser CORS rules, and Open Food Facts asks apps to name themselves
      const r = await CapacitorHttp.get({ url, headers: { Accept: "application/json", "User-Agent": "Pulse/1.0 (Android)" }, responseType: "json" });
      status = r.status;
      body = (typeof r.data === "string" ? JSON.parse(r.data) : r.data) ?? {};
    } else {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      status = r.status;
      body = r.ok ? await r.json() : {};
    }
  } catch {
    throw new ScanError("No internet — scanning needs a connection to look the food up");
  }
  if (status === 404) return null;
  if (status < 200 || status >= 300) throw new ScanError("Couldn't reach Open Food Facts — try again");
  if (!body.product || body.status === 0) return null;
  return foodFromOff(code, body.product);
}
