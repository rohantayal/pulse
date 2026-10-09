/**
 * Simple animated stick-sketch for exercises (side view, facing right).
 *
 * Each movement pattern is two poses (start A, end B) that the figure loops between.
 * Angles are absolute degrees: limbs use 0 = pointing down, 90 = forward (right), 180 = up,
 * -90 = back (left). The torso uses 0 = upright, 90 = leaning forward, -90 = lying with the head
 * back (left). One joint is pinned (feet on the floor, hips on a seat, hands on a bar) and the
 * rest of the body hangs off it, so a squat goes down and a pull-up goes up.
 */

export interface Pose {
  /** torso lean */
  t: number;
  /** upper arm, forearm (near arm); ua2/fa2 = far arm, defaults to near */
  ua: number;
  fa: number;
  /** thigh, shin (near leg); th2/sh2 = far leg, defaults to near */
  th: number;
  sh: number;
  ua2?: number;
  fa2?: number;
  th2?: number;
  sh2?: number;
  /** foot angle (90 = flat, pointing forward) */
  ft?: number;
  /** shoulders lifted along the torso (shrugs), px */
  sy?: number;
  /** whole body lifted (calf raises), px */
  lift?: number;
}

export type Anchor = "foot" | "hip" | "hand" | "knee";
export type Prop = "bar" | "db" | "kb" | "bench" | "incline" | "seat" | "pullbar" | "dipbars" | "cableUp" | "cableFwd" | "cableLow" | "wheel" | "pad";

export interface Pattern {
  anchor: Anchor;
  /** where the anchor sits in the 200×150 drawing */
  at: [number, number];
  A: Pose;
  B: Pose;
  props?: Prop[];
  /** seconds for one A→B→A cycle */
  period?: number;
  /** draw the figure smaller (hanging exercises are taller than the frame) */
  scale?: number;
}

const P = (anchor: Anchor, at: [number, number], A: Pose, B: Pose, props?: Prop[], period?: number, scale?: number): Pattern => ({ anchor, at, A, B, props, period, scale });
const stand: Pose = { t: 0, ua: 0, fa: 0, th: 0, sh: 0 };
const FLOOR: [number, number] = [100, 136];

export const PATTERNS = {
  squat: P("foot", FLOOR, { t: 6, ua: -45, fa: 170, th: 0, sh: 0 }, { t: 42, ua: -40, fa: 170, th: 88, sh: -22 }, ["bar"]),
  gobletSquat: P("foot", FLOOR, { t: 4, ua: 15, fa: 165, th: 0, sh: 0 }, { t: 30, ua: 30, fa: 165, th: 88, sh: -22 }, ["kb"]),
  legPress: P("hip", [70, 105], { t: -50, ua: 20, fa: 30, th: 165, sh: 75 }, { t: -50, ua: 20, fa: 30, th: 120, sh: 120 }, ["seat"]),
  deadlift: P("foot", FLOOR, stand, { t: 72, ua: 0, fa: 0, th: 50, sh: -18 }, ["bar"], 2.6),
  rdl: P("foot", FLOOR, stand, { t: 78, ua: 0, fa: 0, th: 12, sh: -4 }, ["bar"], 2.6),
  lunge: P("foot", [118, 136], { t: 2, ua: 0, fa: 0, th: 0, sh: 0, th2: 0, sh2: 0 }, { t: 4, ua: 0, fa: 0, th: 85, sh: 0, th2: -18, sh2: -95 }, ["db"]),
  splitSquat: P("foot", [122, 136], { t: 4, ua: 0, fa: 0, th: 30, sh: 0, th2: -40, sh2: -110 }, { t: 8, ua: 0, fa: 0, th: 88, sh: 0, th2: -15, sh2: -100 }, ["db", "pad"]),
  legExtension: P("hip", [100, 100], { t: 0, ua: 10, fa: 10, th: 90, sh: 0 }, { t: 0, ua: 10, fa: 10, th: 90, sh: 85 }, ["seat"]),
  legCurlLying: P("hip", [105, 100], { t: -90, ua: -160, fa: -120, th: 90, sh: 90 }, { t: -90, ua: -160, fa: -120, th: 90, sh: 175 }, ["bench"]),
  legCurlSeated: P("hip", [100, 100], { t: -5, ua: 10, fa: 10, th: 90, sh: 85 }, { t: -5, ua: 10, fa: 10, th: 90, sh: -5 }, ["seat"]),
  hipThrust: P("foot", [140, 136], { t: -60, ua: 100, fa: 95, th: 125, sh: 0 }, { t: -86, ua: 98, fa: 95, th: 92, sh: 0 }, ["bar"]),
  calfRaise: P("foot", FLOOR, { ...stand, ft: 90 }, { ...stand, ft: 40, lift: 7 }, undefined, 1.6),
  bench: P("hip", [110, 100], { t: -90, ua: 180, fa: 180, th: 90, sh: 0 }, { t: -90, ua: 25, fa: 172, th: 90, sh: 0 }, ["bench", "bar"]),
  inclineBench: P("hip", [115, 100], { t: -60, ua: 155, fa: 155, th: 95, sh: 0 }, { t: -60, ua: 15, fa: 160, th: 95, sh: 0 }, ["incline", "bar"]),
  dbBench: P("hip", [110, 100], { t: -90, ua: 180, fa: 180, th: 90, sh: 0 }, { t: -90, ua: 25, fa: 172, th: 90, sh: 0 }, ["bench", "db"]),
  fly: P("hip", [110, 100], { t: -90, ua: 180, fa: 175, th: 90, sh: 0 }, { t: -90, ua: 110, fa: 100, th: 90, sh: 0 }, ["bench", "db"]),
  chestPress: P("hip", [85, 105], { t: 0, ua: -85, fa: 90, th: 90, sh: 0 }, { t: 0, ua: 90, fa: 90, th: 90, sh: 0 }, ["seat"]),
  cableFly: P("foot", FLOOR, { t: 15, ua: 125, fa: 115, th: 0, sh: 0 }, { t: 15, ua: 40, fa: 50, th: 0, sh: 0 }, ["cableUp"]),
  pushUp: P("hand", [58, 136], { t: -66, ua: 0, fa: 0, th: 66, sh: 66 }, { t: -84, ua: 120, fa: -10, th: 85, sh: 85 }),
  plank: P("foot", [160, 136], { t: -77, ua: 0, fa: -90, th: 77, sh: 77 }, { t: -78, ua: 0, fa: -90, th: 78, sh: 78 }, undefined, 3),
  dips: P("hand", [100, 72], { t: 8, ua: 0, fa: 0, th: 10, sh: -40 }, { t: 22, ua: -60, fa: 5, th: 10, sh: -40 }, ["dipbars"]),
  ohp: P("foot", FLOOR, { ...stand, ua: 20, fa: 175 }, { ...stand, ua: 180, fa: 180 }, ["bar"]),
  dbPress: P("foot", FLOOR, { ...stand, ua: 20, fa: 175 }, { ...stand, ua: 180, fa: 180 }, ["db"]),
  raise: P("foot", FLOOR, { ...stand, ua: 8, fa: 8 }, { ...stand, ua: 90, fa: 92 }, ["db"]),
  cableRaise: P("foot", FLOOR, { ...stand, ua: 8, fa: 8 }, { ...stand, ua: 90, fa: 92 }, ["cableLow"]),
  rearFly: P("foot", FLOOR, { t: 70, ua: 0, fa: 0, th: 20, sh: -8 }, { t: 70, ua: -75, fa: -75, th: 20, sh: -8 }, ["db"]),
  uprightRow: P("foot", FLOOR, { ...stand, ua: 3, fa: 3 }, { ...stand, ua: -110, fa: 25 }, ["bar"]),
  shrug: P("foot", FLOOR, stand, { ...stand, sy: -6 }, ["db"], 1.6),
  facePull: P("foot", FLOOR, { ...stand, ua: 90, fa: 90 }, { ...stand, ua: -80, fa: 150 }, ["cableFwd"]),
  row: P("foot", FLOOR, { t: 68, ua: 0, fa: 0, th: 22, sh: -10 }, { t: 68, ua: -60, fa: 10, th: 22, sh: -10 }, ["bar"]),
  dbRow: P("foot", FLOOR, { t: 72, ua: 0, fa: 0, th: 25, sh: -10 }, { t: 72, ua: -60, fa: 10, th: 25, sh: -10 }, ["db"]),
  seatedRow: P("hip", [80, 108], { t: 15, ua: 90, fa: 90, th: 90, sh: 75 }, { t: -5, ua: -50, fa: 85, th: 90, sh: 75 }, ["cableFwd"]),
  pulldown: P("hip", [100, 104], { t: 8, ua: 172, fa: 176, th: 90, sh: 0 }, { t: -6, ua: -25, fa: 172, th: 90, sh: 0 }, ["seat", "cableUp"]),
  pullUp: P("hand", [100, 10], { t: 0, ua: 180, fa: 180, th: 8, sh: -25 }, { t: -4, ua: -25, fa: 175, th: 8, sh: -25 }, ["pullbar"], 2.4, 0.8),
  curl: P("foot", FLOOR, { ...stand, ua: 0, fa: 2 }, { ...stand, ua: 6, fa: 150 }, ["db"]),
  barCurl: P("foot", FLOOR, { ...stand, ua: 0, fa: 2 }, { ...stand, ua: 6, fa: 150 }, ["bar"]),
  preacher: P("foot", FLOOR, { t: 15, ua: 45, fa: 50, th: 0, sh: 0 }, { t: 15, ua: 45, fa: 165, th: 0, sh: 0 }, ["bar", "pad"]),
  cableCurl: P("foot", FLOOR, { ...stand, ua: 0, fa: 5 }, { ...stand, ua: 5, fa: 150 }, ["cableLow"]),
  pushdown: P("foot", FLOOR, { ...stand, t: 8, ua: 5, fa: 120 }, { ...stand, t: 8, ua: 5, fa: 5 }, ["cableUp"]),
  overheadExt: P("foot", FLOOR, { ...stand, ua: 170, fa: -20 }, { ...stand, ua: 172, fa: 176 }, ["db"]),
  skullCrusher: P("hip", [110, 100], { t: -90, ua: 165, fa: 168, th: 90, sh: 0 }, { t: -90, ua: 165, fa: -135, th: 90, sh: 0 }, ["bench", "bar"]),
  crunch: P("hip", [110, 120], { t: -90, ua: -150, fa: -170, th: 135, sh: 30 }, { t: -55, ua: -115, fa: -140, th: 135, sh: 30 }, undefined, 1.8),
  cableCrunch: P("knee", [105, 134], { t: 10, ua: -150, fa: 20, th: 0, sh: -90 }, { t: 78, ua: -150, fa: 20, th: 0, sh: -90 }, ["cableUp"]),
  legRaise: P("hand", [100, 10], { t: 0, ua: 180, fa: 180, th: 0, sh: 0 }, { t: -8, ua: 180, fa: 180, th: 95, sh: 95 }, ["pullbar"], 2.4, 0.8),
  russianTwist: P("hip", [100, 118], { t: -28, ua: 55, fa: 70, th: 140, sh: 70 }, { t: -28, ua: 115, fa: 125, th: 140, sh: 70 }, ["kb"], 1.6),
  abWheel: P("knee", [100, 134], { t: 40, ua: 8, fa: 8, th: 0, sh: -90 }, { t: 98, ua: 78, fa: 78, th: 0, sh: -90 }, ["wheel"], 2.6),
  backExtension: P("hip", [110, 75], { t: -45, ua: -135, fa: -135, th: 45, sh: 45 }, { t: -150, ua: -150, fa: -150, th: 45, sh: 45 }, ["pad"], 2.4),
  kbSwing: P("foot", FLOOR, { t: 62, ua: -12, fa: -12, th: 32, sh: -18 }, { ...stand, ua: 95, fa: 95 }, ["kb"], 1.4),
  cleanPress: P("foot", FLOOR, { t: 70, ua: 0, fa: 0, th: 50, sh: -18 }, { ...stand, ua: 180, fa: 180 }, ["bar"], 2.8),
  burpee: P("foot", [150, 136], stand, { t: -64, ua: 0, fa: 0, th: 64, sh: 64 }, undefined, 1.8),
  walk: P("hip", [100, 70], { ...stand, th: 22, sh: 0, th2: -22, sh2: -20 }, { ...stand, th: -22, sh: -20, th2: 22, sh2: 0 }, ["db"], 1.2),
  idle: P("foot", FLOOR, stand, { ...stand, t: 3 }, undefined, 3),
} satisfies Record<string, Pattern>;

export type PatternName = keyof typeof PATTERNS;

/** Preloaded exercise id (without "pre:") → movement. */
const BY_EXERCISE: Record<string, PatternName> = {
  "bench-press-bb": "bench",
  "bench-press-db": "dbBench",
  "incline-bench-bb": "inclineBench",
  "incline-bench-db": "inclineBench",
  "decline-bench-bb": "bench",
  "chest-fly-db": "fly",
  "cable-crossover": "cableFly",
  "pec-deck": "chestPress",
  "chest-press-machine": "chestPress",
  "push-up": "pushUp",
  "dips-chest": "dips",
  "deadlift-bb": "deadlift",
  "pull-up": "pullUp",
  "chin-up": "pullUp",
  "lat-pulldown": "pulldown",
  "bent-over-row-bb": "row",
  "db-row": "dbRow",
  "seated-cable-row": "seatedRow",
  "t-bar-row": "row",
  "face-pull": "facePull",
  "back-extension": "backExtension",
  "shrug-db": "shrug",
  "ohp-bb": "ohp",
  "shoulder-press-db": "dbPress",
  "arnold-press": "dbPress",
  "lateral-raise-db": "raise",
  "lateral-raise-cable": "cableRaise",
  "front-raise-db": "raise",
  "rear-delt-fly": "rearFly",
  "upright-row": "uprightRow",
  "bicep-curl-bb": "barCurl",
  "bicep-curl-db": "curl",
  "hammer-curl": "curl",
  "preacher-curl": "preacher",
  "cable-curl": "cableCurl",
  "tricep-pushdown": "pushdown",
  "skull-crusher": "skullCrusher",
  "overhead-tricep-db": "overheadExt",
  "close-grip-bench": "bench",
  "dips-tricep": "dips",
  "squat-bb": "squat",
  "front-squat": "squat",
  "goblet-squat": "gobletSquat",
  "leg-press": "legPress",
  "leg-extension": "legExtension",
  "lunge-db": "lunge",
  "bulgarian-split": "splitSquat",
  "hack-squat": "squat",
  "rdl-bb": "rdl",
  "leg-curl-lying": "legCurlLying",
  "leg-curl-seated": "legCurlSeated",
  "hip-thrust": "hipThrust",
  "glute-bridge": "hipThrust",
  "calf-raise-standing": "calfRaise",
  "calf-raise-seated": "calfRaise",
  plank: "plank",
  crunch: "crunch",
  "hanging-leg-raise": "legRaise",
  "cable-crunch": "cableCrunch",
  "russian-twist": "russianTwist",
  "ab-wheel": "abWheel",
  "kb-swing": "kbSwing",
  "clean-and-press": "cleanPress",
  burpee: "burpee",
  "farmers-walk": "walk",
};

/** For custom exercises: a typical movement for the muscle group. */
const BY_GROUP: Record<string, PatternName> = {
  Chest: "bench",
  Back: "row",
  Shoulders: "dbPress",
  Biceps: "curl",
  Triceps: "pushdown",
  Quadriceps: "squat",
  Hamstrings: "rdl",
  Glutes: "hipThrust",
  Calves: "calfRaise",
  Abs: "crunch",
  "Full body": "cleanPress",
  Cardio: "walk",
};

export function patternFor(ex: { id: string; muscle: string }): PatternName {
  const key = ex.id.startsWith("pre:") ? ex.id.slice(4) : "";
  return BY_EXERCISE[key] ?? BY_GROUP[ex.muscle] ?? "idle";
}

export const PRELOADED_PATTERN_IDS = Object.keys(BY_EXERCISE);

// ---------------------------------------------------------------- solving a pose into points

export const LEN = { torso: 44, neck: 13, upperArm: 25, foreArm: 23, thigh: 33, shin: 31, foot: 10, head: 8 };

export type Pt = [number, number];
export interface Skeleton {
  hip: Pt;
  shoulder: Pt;
  head: Pt;
  elbow: Pt;
  hand: Pt;
  elbow2: Pt;
  hand2: Pt;
  knee: Pt;
  ankle: Pt;
  toe: Pt;
  knee2: Pt;
  ankle2: Pt;
  toe2: Pt;
}

const rad = (d: number) => (d * Math.PI) / 180;
const limb = (from: Pt, angle: number, len: number): Pt => [from[0] + Math.sin(rad(angle)) * len, from[1] + Math.cos(rad(angle)) * len];

export function lerpPose(a: Pose, b: Pose, k: number): Pose {
  const l = (x: number | undefined, y: number | undefined, d: number) => (x ?? d) + ((y ?? d) - (x ?? d)) * k;
  return {
    t: l(a.t, b.t, 0),
    ua: l(a.ua, b.ua, 0),
    fa: l(a.fa, b.fa, 0),
    th: l(a.th, b.th, 0),
    sh: l(a.sh, b.sh, 0),
    ua2: l(a.ua2 ?? a.ua, b.ua2 ?? b.ua, 0),
    fa2: l(a.fa2 ?? a.fa, b.fa2 ?? b.fa, 0),
    th2: l(a.th2 ?? a.th, b.th2 ?? b.th, 0),
    sh2: l(a.sh2 ?? a.sh, b.sh2 ?? b.sh, 0),
    ft: l(a.ft, b.ft, 90),
    sy: l(a.sy, b.sy, 0),
    lift: l(a.lift, b.lift, 0),
  };
}

/** Joint positions for a pose, shifted so the pattern's anchor joint sits at `at`. */
export function solve(p: Pose, anchor: Anchor, at: Pt, scale = 1): Skeleton {
  const hip: Pt = [0, 0];
  const tr = rad(p.t);
  const dir: Pt = [Math.sin(tr), -Math.cos(tr)];
  const sy = p.sy ?? 0;
  const shoulder: Pt = [hip[0] + dir[0] * (LEN.torso - sy), hip[1] + dir[1] * (LEN.torso - sy)];
  const neckBase: Pt = [hip[0] + dir[0] * LEN.torso, hip[1] + dir[1] * LEN.torso];
  const head: Pt = [neckBase[0] + dir[0] * LEN.neck, neckBase[1] + dir[1] * LEN.neck];
  const elbow = limb(shoulder, p.ua, LEN.upperArm);
  const hand = limb(elbow, p.fa, LEN.foreArm);
  const elbow2 = limb(shoulder, p.ua2 ?? p.ua, LEN.upperArm);
  const hand2 = limb(elbow2, p.fa2 ?? p.fa, LEN.foreArm);
  const knee = limb(hip, p.th, LEN.thigh);
  const ankle = limb(knee, p.sh, LEN.shin);
  const toe = limb(ankle, p.ft ?? 90, LEN.foot);
  const knee2 = limb(hip, p.th2 ?? p.th, LEN.thigh);
  const ankle2 = limb(knee2, p.sh2 ?? p.sh, LEN.shin);
  const toe2 = limb(ankle2, p.ft ?? 90, LEN.foot);
  const sk: Skeleton = { hip, shoulder, head, elbow, hand, elbow2, hand2, knee, ankle, toe, knee2, ankle2, toe2 };
  if (scale !== 1) for (const k of Object.keys(sk) as (keyof Skeleton)[]) sk[k] = [sk[k][0] * scale, sk[k][1] * scale];
  const pin = anchor === "foot" ? sk.ankle : anchor === "hand" ? sk.hand : anchor === "knee" ? sk.knee : sk.hip;
  const dx = at[0] - pin[0];
  const dy = at[1] - pin[1] - (p.lift ?? 0);
  for (const k of Object.keys(sk) as (keyof Skeleton)[]) sk[k] = [sk[k][0] + dx, sk[k][1] + dy];
  return sk;
}
