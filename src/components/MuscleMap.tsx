import type { Region, MuscleTargets } from "../lib/muscles";

/**
 * Line-sketch body (front or back) with the worked muscles in red: solid for the main muscles,
 * lighter for the helpers. Each muscle is its own shape so any combination can be highlighted.
 */

const PRIMARY = "#e5484d";
const SECONDARY = "#e5484d";
const BASE_FILL = "#26262b";
const LINE = "#7a7a84";

/** A shape lights up if any of its regions is worked (e.g. the shoulder cap shows front and side delts). */
type Shape = { region?: Region | Region[]; d: string };

const mirror = (d: string) =>
  // mirror an absolute path around x = 50 (only M/L/Q/C/Z with absolute coords are used below)
  d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${+(100 - +x).toFixed(2)},${y}`);

const both = (region: Region | Region[] | undefined, d: string): Shape[] => [
  { region, d },
  { region, d: mirror(d) },
];

// ---- shared silhouette pieces (not muscles)
const HEAD = "M50,4 C57,4 60,10 60,17 C60,25 55,30 50,30 C45,30 40,25 40,17 C40,10 43,4 50,4 Z";
const NECK = "M45,28 L55,28 L56,35 L44,35 Z";
const HAND = "M16,113 C14,116 14,122 17,124 C20,125 22,121 22,116 Z";
const FOOT = "M36,188 L45,188 L46,194 L33,194 Z";

const FRONT: Shape[] = [
  { d: HEAD },
  { d: NECK },
  { region: "traps", d: "M44,33 L56,33 L64,38 L36,38 Z" },
  ...both(["frontDelts", "sideDelts"], "M36,38 C30,37 25,41 24,49 C24,53 26,55 29,55 L33,46 Z"),
  ...both("chest", "M50,40 L50,59 C45,62 38,62 34,57 C32,52 32,46 35,41 Z"),
  ...both("biceps", "M24,55 C22,62 22,70 24,77 L30,77 C32,70 32,62 30,55 Z"),
  ...both("forearms", "M23,79 C19,88 17,100 17,111 L22,112 C25,101 28,90 30,79 Z"),
  ...both("abs", "M44.5,61 L49.3,61 L49.3,70 L44.5,70 Z"),
  ...both("abs", "M44.5,71.5 L49.3,71.5 L49.3,81 L44.5,81 Z"),
  ...both("abs", "M44.5,82.5 L49.3,82.5 L49.3,93 L44.5,93 Z"),
  ...both("obliques", "M35,60 C34,72 35,85 38,97 L43,97 L43,62 Z"),
  { d: "M38,98 L62,98 L64,108 L36,108 Z" },
  ...both("quads", "M36,109 C33,122 34,138 38,150 L46,150 C48,138 49,122 49,111 Z"),
  ...both(undefined, "M38,151 L46,151 L46,157 L38,157 Z"),
  ...both("calves", "M38,158 C36,168 37,178 39,187 L45,187 C46,178 47,168 46,158 Z"),
  ...both(undefined, HAND),
  ...both(undefined, FOOT),
];

const BACK: Shape[] = [
  { d: HEAD },
  { d: NECK },
  { region: "traps", d: "M50,31 L64,38 L50,52 L36,38 Z" },
  ...both(["rearDelts", "sideDelts"], "M36,38 C30,37 25,41 24,49 C24,53 26,55 29,55 L33,46 Z"),
  { region: "midBack", d: "M44,46 L56,46 L55,66 L45,66 Z" },
  ...both("lats", "M36,42 C33,55 35,72 41,86 L49,78 L49,68 L43,66 L43,48 Z"),
  ...both("triceps", "M24,55 C22,62 22,70 24,77 L30,77 C32,70 32,62 30,55 Z"),
  ...both("forearms", "M23,79 C19,88 17,100 17,111 L22,112 C25,101 28,90 30,79 Z"),
  { region: "lowerBack", d: "M42,82 L58,82 L58,97 L42,97 Z" },
  ...both("glutes", "M36,99 C34,106 36,115 43,117 C47,117 49,113 49.5,108 L49.5,99 Z"),
  ...both("hamstrings", "M36,119 C34,130 35,141 38,150 L46,150 C48,141 49,130 49,119 Z"),
  ...both(undefined, "M38,151 L46,151 L46,157 L38,157 Z"),
  ...both("calves", "M37,158 C35,166 36,176 39,187 L45,187 C47,176 48,166 46,158 Z"),
  ...both(undefined, HAND),
  ...both(undefined, FOOT),
];

const UPPER = new Set<Region>(["chest", "frontDelts", "sideDelts", "rearDelts", "biceps", "triceps", "forearms", "abs", "obliques", "traps", "lats", "midBack", "lowerBack"]);

/** Zoomed crop for small thumbnails: the torso for upper-body work, hips-to-feet for legs. */
export function cropFor(t: MuscleTargets): string {
  if (t.primary.length && t.primary.every((r) => UPPER.has(r))) return "14 2 72 100";
  if (t.primary.length && t.primary.every((r) => !UPPER.has(r))) return "14 94 72 102";
  return "12 0 76 198";
}

export function MuscleFigure({ view, targets, className, viewBox = "12 0 76 198" }: { view: "front" | "back"; targets: MuscleTargets; className?: string; viewBox?: string }) {
  const shapes = view === "front" ? FRONT : BACK;
  const list = (r?: Region | Region[]) => (r ? (Array.isArray(r) ? r : [r]) : []);
  const isPrimary = (r?: Region | Region[]) => list(r).some((x) => targets.primary.includes(x));
  const isSecondary = (r?: Region | Region[]) => list(r).some((x) => targets.secondary.includes(x));
  const fill = (r?: Region | Region[]) => (isPrimary(r) ? PRIMARY : isSecondary(r) ? SECONDARY : BASE_FILL);
  const opacity = (r?: Region | Region[]) => (!isPrimary(r) && isSecondary(r) ? 0.45 : 1);
  return (
    <svg viewBox={viewBox} className={className} aria-hidden>
      {shapes.map((s, i) => (
        <path key={i} d={s.d} fill={fill(s.region)} fillOpacity={opacity(s.region)} stroke={LINE} strokeWidth={0.9} strokeLinejoin="round" />
      ))}
    </svg>
  );
}

/** Front and back side by side, with a legend. */
export function MuscleMap({ targets }: { targets: MuscleTargets }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <MuscleFigure view="front" targets={targets} className="h-44" />
      <MuscleFigure view="back" targets={targets} className="h-44" />
    </div>
  );
}
