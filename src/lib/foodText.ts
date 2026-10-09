import type { Food } from "../types";

/**
 * Turns free text like "2 roti, 1 bowl dal tadka and 150g paneer" into food items:
 * split into parts, pull a quantity + unit out of each part, then fuzzy-match the rest
 * against the food list.
 */

export type Unit = "serving" | "g";

export interface ParsedPart {
  /** The original text of this part, trimmed */
  raw: string;
  /** What's left after removing quantity/unit words — the thing we search for */
  query: string;
  qty: number;
  unit: Unit;
  /** True when the user wrote a number; false when we assumed 1 serving */
  explicitQty: boolean;
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  half: 0.5, quarter: 0.25, couple: 2, dozen: 12,
};

const UNICODE_FRACTIONS: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };

/** Units measured by weight/volume (ml is treated as ≈ g, close enough for food tracking). */
const WEIGHT_UNITS: Record<string, number> = {
  g: 1, gm: 1, gms: 1, gram: 1, grams: 1, gr: 1,
  kg: 1000, kgs: 1000, kilo: 1000, kilos: 1000,
  ml: 1, mls: 1, l: 1000, ltr: 1000, litre: 1000, liter: 1000, litres: 1000, liters: 1000,
};

/** Container/size words that just mean "servings" — dropped from the search text. */
const SERVING_WORDS = new Set([
  "serving", "servings", "serve", "piece", "pieces", "pc", "pcs", "bowl", "bowls", "katori", "katoris",
  "cup", "cups", "plate", "plates", "slice", "slices", "scoop", "scoops", "glass", "glasses",
  "tbsp", "tsp", "tablespoon", "tablespoons", "teaspoon", "teaspoons", "medium", "small", "large",
  "big", "portion", "portions", "x", "nos", "no", "unit", "units", "pack", "packet", "packets", "can", "cans", "bar", "bars",
]);

const STOP_WORDS = new Set([
  "of", "with", "some", "the", "and", "had", "ate", "i", "my", "for", "in", "on", "little", "bit",
  // words that describe how food was made/served but never pick a different food
  "homemade", "home", "made", "fresh", "hot", "cold", "warm", "ghar", "ka", "ki", "ke", "wala", "wali", "wale",
]);

/** Hindi/Indian-English words → the words our food names use. */
const ALIASES: Record<string, string> = {
  chapati: "roti", chapatti: "roti", chappati: "roti", fulka: "phulka", rotis: "roti",
  dahi: "curd", yoghurt: "yogurt",
  anda: "egg", ande: "egg", omlette: "omelette", omelet: "omelette",
  chawal: "rice", doodh: "milk", aloo: "aloo", alu: "aloo", kela: "banana", seb: "apple", aam: "mango",
  chai: "chai", tea: "chai", daal: "dal", dhal: "dal", dhall: "dal", chana: "chickpea", channa: "chole",
  murgh: "chicken", murg: "chicken", paneer: "paneer", subzi: "sabzi", sabji: "sabzi", sabjee: "sabzi",
  bhindi: "bhindi", okra: "bhindi", maggie: "noodles", maggi: "noodles", noodle: "noodles",
  curd: "curd", oat: "oats", porridge: "oats", nut: "nuts", peanut: "peanuts", almond: "almonds",
  cashew: "cashews", walnut: "walnuts", fries: "fries", chip: "chips", coke: "cola", pepsi: "cola",
  shake: "whey", protein: "protein", biscuit: "biscuits", cookie: "biscuits",
};

function toNumber(tok: string): number | null {
  if (tok in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[tok];
  if (/^\d+(\.\d+)?$/.test(tok)) return Number(tok);
  if (/^\.\d+$/.test(tok)) return Number(tok);
  const frac = tok.match(/^(\d+)\/(\d+)$/);
  if (frac && Number(frac[2]) > 0) return Number(frac[1]) / Number(frac[2]);
  return null;
}

export function splitParts(text: string): string[] {
  return text
    .split(/[,;\n+]|\band\b|&|\bwith\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parsePart(raw: string): ParsedPart {
  // Separate numbers glued to units/x: "150g" → "150 g", "2x" → "2 x", "x2" → "x 2"
  const spaced = raw
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/(\d)([a-z½¼¾])/g, "$1 $2")
    .replace(/\bx(\d)/g, "x $1")
    .replace(/([½¼¾⅓⅔])/g, " $1 ");
  const toks = spaced.split(/\s+/).filter(Boolean);

  let qty: number | null = null;
  let unit: Unit = "serving";
  let multiplier = 1;
  const rest: string[] = [];

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    let n = toNumber(t);
    // "1 1/2" → 1.5
    if (n != null && i + 1 < toks.length) {
      const next = toNumber(toks[i + 1]);
      if (next != null && next < 1 && /\/|[½¼¾⅓⅔]/.test(toks[i + 1])) {
        n += next;
        i++;
      }
    }
    if (n == null && t in NUMBER_WORDS && qty == null) {
      // "a"/"an" only count as a quantity at the very start ("an apple")
      if ((t === "a" || t === "an") && i !== 0) continue;
      n = NUMBER_WORDS[t];
    }
    if (n != null && qty == null) {
      qty = n;
      const u = toks[i + 1];
      if (u && u in WEIGHT_UNITS) {
        unit = "g";
        multiplier = WEIGHT_UNITS[u];
        i++;
      }
      continue;
    }
    if (t in WEIGHT_UNITS && qty != null && unit === "serving" && rest.length > 0 && i === toks.length - 1) {
      unit = "g";
      multiplier = WEIGHT_UNITS[t];
      continue;
    }
    if (SERVING_WORDS.has(t) || STOP_WORDS.has(t)) continue;
    if (/^[^a-z0-9]+$/.test(t)) continue;
    rest.push(t);
  }

  return {
    raw: raw.trim(),
    query: rest.join(" "),
    qty: qty != null ? qty * multiplier : 1,
    unit,
    explicitQty: qty != null,
  };
}

export function parseFoodText(text: string): ParsedPart[] {
  return splitParts(text)
    .map(parsePart)
    .filter((p) => p.query.length > 0);
}

// ---------------------------------------------------------------- matching

function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && w.endsWith("es") && /(ch|sh|x|o)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

function normTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9%\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP_WORDS.has(t))
    .map((t) => stem(ALIASES[t] ?? t));
}

function editDistanceAtMost1(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** 1 = exact, 0.8 = prefix, 0.7 = typo, 0 = no match */
function tokenScore(q: string, f: string): number {
  if (q === f) return 1;
  if (q.length >= 3 && f.length >= 3 && (f.startsWith(q) || q.startsWith(f))) return 0.8;
  if (q.length >= 5 && f.length >= 5 && editDistanceAtMost1(q, f)) return 0.7;
  return 0;
}

export interface Match {
  food: Food;
  score: number;
  /** Every word you typed matched a word of this food. Only full matches are picked automatically. */
  full: boolean;
}

/**
 * Rank foods for a search phrase. Score is mostly "how much of what you typed is covered",
 * with a smaller bonus for how much of the food's name is covered (so "dal" prefers
 * "Dal Tadka" over "Dal Makhani Special Thali").
 */
export function rankFoods(query: string, foods: Food[], recentIds: string[] = []): Match[] {
  const q = normTokens(query);
  if (q.length === 0) return [];
  const recent = new Map(recentIds.map((id, i) => [id, i]));
  const out: (Match & { idx: number })[] = [];
  foods.forEach((food, idx) => {
    const ft = normTokens(`${food.name} ${food.brand ?? ""}`);
    if (ft.length === 0) return;
    let covered = 0;
    let missed = 0;
    const hit = new Set<string>();
    for (const qt of q) {
      let best = 0;
      let bestTok = "";
      for (const t of ft) {
        const s = tokenScore(qt, t);
        if (s > best) {
          best = s;
          bestTok = t;
        }
      }
      covered += best;
      if (bestTok) hit.add(bestTok);
      else missed++;
    }
    const queryCoverage = covered / q.length;
    if (queryCoverage < 0.5) return;
    // How much of the food's *main* name we covered. "(whole, boiled)" is a descriptor and
    // "Roti / Chapati" are alternatives, so neither should count against the match.
    const main = food.name.replace(/\([^)]*\)/g, " ");
    const nameCoverage = Math.max(
      ...main.split("/").map((alt) => {
        const at = normTokens(alt);
        return at.length ? at.filter((t) => hit.has(t)).length / at.length : 0;
      }),
    );
    const exact = main.split("/").some((alt) => normTokens(alt).join(" ") === q.join(" ")) ? 0.3 : 0;
    const r = recent.get(food.id);
    const recency = r != null ? 0.08 * (1 - r / Math.max(1, recentIds.length)) : 0;
    const mine = food.custom ? 0.05 : 0;
    out.push({ food, idx, full: missed === 0, score: queryCoverage + 0.35 * nameCoverage + exact + recency + mine });
  });
  // Ties go to list order — the built-in list puts the everyday version first (white rice before jeera rice).
  return out.sort((a, b) => b.score - a.score || a.idx - b.idx).map(({ food, score, full }) => ({ food, score, full }));
}

/**
 * The best match, or null when nothing is a confident match. Only foods that account for every
 * word you typed qualify — "tomato curry" must not quietly become "Tomato" just because one word fits.
 */
export function bestMatch(query: string, foods: Food[], recentIds: string[] = []): Food | null {
  const top = rankFoods(query, foods, recentIds).find((m) => m.full);
  return top && top.score >= 0.75 ? top.food : null;
}

/** Close-but-not-full matches, offered as "Did you mean…" when nothing matched. */
export function suggestions(query: string, foods: Food[], recentIds: string[] = [], limit = 3): Food[] {
  return rankFoods(query, foods, recentIds)
    .slice(0, limit)
    .map((m) => m.food);
}

// ---------------------------------------------------------------- serving weight

/** Grams in one serving: explicit `grams`, else parsed from "1 bowl (200 g)" / "100 g" / "1 can (330 ml)". */
export function gramsPerServing(f: { grams?: number; serving: string }): number | undefined {
  if (f.grams && f.grams > 0) return f.grams;
  const m = f.serving.match(/(\d+(?:\.\d+)?)\s*(g|gm|grams?|ml)\b/i);
  return m ? Number(m[1]) : undefined;
}
