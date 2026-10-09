import type { Exercise } from "../types";

/** Regions drawn on the body map. */
export type Region =
  | "chest"
  | "frontDelts"
  | "sideDelts"
  | "rearDelts"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "traps"
  | "lats"
  | "midBack"
  | "lowerBack"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves";

export const REGION_LABEL: Record<Region, string> = {
  chest: "Chest",
  frontDelts: "Front delts",
  sideDelts: "Side delts",
  rearDelts: "Rear delts",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  abs: "Abdominals",
  obliques: "Obliques",
  traps: "Traps",
  lats: "Lats",
  midBack: "Upper back",
  lowerBack: "Lower back",
  glutes: "Glutes",
  quads: "Quadriceps",
  hamstrings: "Hamstrings",
  calves: "Calves",
};

/** Regions you can see from the back; everything else is drawn on the front. */
const BACK_REGIONS = new Set<Region>(["rearDelts", "triceps", "traps", "lats", "midBack", "lowerBack", "glutes", "hamstrings", "calves"]);

export interface MuscleTargets {
  primary: Region[];
  secondary: Region[];
}

/** Defaults by the exercise's muscle group (used for custom exercises too). */
const BY_GROUP: Record<string, MuscleTargets> = {
  Chest: { primary: ["chest"], secondary: ["frontDelts", "triceps"] },
  Back: { primary: ["lats", "midBack"], secondary: ["biceps", "rearDelts"] },
  Shoulders: { primary: ["frontDelts", "sideDelts"], secondary: ["triceps", "traps"] },
  Biceps: { primary: ["biceps"], secondary: ["forearms"] },
  Triceps: { primary: ["triceps"], secondary: ["chest", "frontDelts"] },
  Quadriceps: { primary: ["quads"], secondary: ["glutes"] },
  Hamstrings: { primary: ["hamstrings"], secondary: ["glutes", "lowerBack"] },
  Glutes: { primary: ["glutes"], secondary: ["hamstrings"] },
  Calves: { primary: ["calves"], secondary: [] },
  Abs: { primary: ["abs"], secondary: ["obliques"] },
  "Full body": { primary: ["quads", "glutes", "frontDelts"], secondary: ["hamstrings", "lowerBack", "traps"] },
  Cardio: { primary: ["quads", "calves"], secondary: ["glutes"] },
  Other: { primary: [], secondary: [] },
};

/** Where the group default isn't precise enough. Keys are preloaded ids without "pre:". */
const BY_EXERCISE: Record<string, MuscleTargets> = {
  "incline-bench-bb": { primary: ["chest", "frontDelts"], secondary: ["triceps"] },
  "incline-bench-db": { primary: ["chest", "frontDelts"], secondary: ["triceps"] },
  "push-up": { primary: ["chest"], secondary: ["triceps", "frontDelts", "abs"] },
  "dips-chest": { primary: ["chest", "triceps"], secondary: ["frontDelts"] },
  "deadlift-bb": { primary: ["lowerBack", "glutes", "hamstrings"], secondary: ["traps", "quads", "forearms"] },
  "pull-up": { primary: ["lats"], secondary: ["biceps", "midBack"] },
  "chin-up": { primary: ["lats", "biceps"], secondary: ["midBack"] },
  "lat-pulldown": { primary: ["lats"], secondary: ["biceps", "midBack"] },
  "face-pull": { primary: ["rearDelts", "midBack"], secondary: ["traps"] },
  "back-extension": { primary: ["lowerBack"], secondary: ["glutes", "hamstrings"] },
  "shrug-db": { primary: ["traps"], secondary: ["forearms"] },
  "ohp-bb": { primary: ["frontDelts"], secondary: ["sideDelts", "triceps"] },
  "shoulder-press-db": { primary: ["frontDelts"], secondary: ["sideDelts", "triceps"] },
  "arnold-press": { primary: ["frontDelts", "sideDelts"], secondary: ["triceps"] },
  "lateral-raise-db": { primary: ["sideDelts"], secondary: ["traps"] },
  "lateral-raise-cable": { primary: ["sideDelts"], secondary: ["traps"] },
  "front-raise-db": { primary: ["frontDelts"], secondary: ["sideDelts"] },
  "rear-delt-fly": { primary: ["rearDelts"], secondary: ["midBack"] },
  "upright-row": { primary: ["sideDelts", "traps"], secondary: ["biceps"] },
  "hammer-curl": { primary: ["biceps", "forearms"], secondary: [] },
  "close-grip-bench": { primary: ["triceps"], secondary: ["chest", "frontDelts"] },
  "dips-tricep": { primary: ["triceps"], secondary: ["chest", "frontDelts"] },
  "squat-bb": { primary: ["quads", "glutes"], secondary: ["hamstrings", "lowerBack"] },
  "front-squat": { primary: ["quads"], secondary: ["glutes", "abs"] },
  "goblet-squat": { primary: ["quads", "glutes"], secondary: ["abs"] },
  "leg-press": { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  "lunge-db": { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  "bulgarian-split": { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  "rdl-bb": { primary: ["hamstrings", "glutes"], secondary: ["lowerBack"] },
  "hip-thrust": { primary: ["glutes"], secondary: ["hamstrings", "quads"] },
  "plank": { primary: ["abs"], secondary: ["obliques", "frontDelts"] },
  "russian-twist": { primary: ["obliques"], secondary: ["abs"] },
  "hanging-leg-raise": { primary: ["abs"], secondary: ["obliques", "forearms"] },
  "kb-swing": { primary: ["glutes", "hamstrings"], secondary: ["lowerBack", "frontDelts"] },
  "clean-and-press": { primary: ["quads", "glutes", "frontDelts"], secondary: ["traps", "triceps", "hamstrings"] },
  "burpee": { primary: ["quads", "chest"], secondary: ["frontDelts", "abs", "triceps"] },
  "farmers-walk": { primary: ["forearms", "traps"], secondary: ["abs", "quads"] },
};

export function musclesFor(ex: Pick<Exercise, "id" | "muscle">): MuscleTargets {
  const key = ex.id.startsWith("pre:") ? ex.id.slice(4) : "";
  return BY_EXERCISE[key] ?? BY_GROUP[ex.muscle] ?? BY_GROUP.Other;
}

/** "Abdominals", "Quadriceps, Glutes" — the main muscles in words. */
export function primaryLabel(ex: Pick<Exercise, "id" | "muscle">): string {
  const t = musclesFor(ex);
  return t.primary.length ? t.primary.map((r) => REGION_LABEL[r]).join(", ") : ex.muscle;
}

/** Which side of the body shows the exercise's main muscle best. */
export function preferredView(t: MuscleTargets): "front" | "back" {
  if (t.primary.length === 0) return "front";
  const back = t.primary.filter((r) => BACK_REGIONS.has(r)).length;
  return back > t.primary.length / 2 ? "back" : "front";
}
