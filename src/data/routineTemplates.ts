/** Starter routines offered during setup and on an empty Routines page. */
export interface RoutineTemplate {
  key: string;
  name: string;
  description: string;
  /** [exercise id without "pre:", sets, rep range] */
  exercises: [string, number, string][];
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    key: "full",
    name: "Full Body",
    description: "Everything in one session — great for 2–3 days a week",
    exercises: [
      ["squat-bb", 3, "6-8"],
      ["bench-press-bb", 3, "6-8"],
      ["bent-over-row-bb", 3, "8-10"],
      ["shoulder-press-db", 3, "8-10"],
      ["rdl-bb", 3, "8-10"],
      ["plank", 3, "30-60s"],
    ],
  },
  {
    key: "push",
    name: "Push",
    description: "Chest, shoulders, triceps",
    exercises: [
      ["bench-press-bb", 4, "6-8"],
      ["incline-bench-db", 3, "8-10"],
      ["shoulder-press-db", 3, "8-10"],
      ["lateral-raise-db", 3, "12-15"],
      ["tricep-pushdown", 3, "10-12"],
    ],
  },
  {
    key: "pull",
    name: "Pull",
    description: "Back, rear delts, biceps",
    exercises: [
      ["deadlift-bb", 3, "5"],
      ["pull-up", 3, "6-10"],
      ["seated-cable-row", 3, "8-12"],
      ["face-pull", 3, "12-15"],
      ["bicep-curl-db", 3, "10-12"],
    ],
  },
  {
    key: "legs",
    name: "Legs",
    description: "Quads, hamstrings, glutes, calves",
    exercises: [
      ["squat-bb", 4, "6-8"],
      ["rdl-bb", 3, "8-10"],
      ["leg-press", 3, "10-12"],
      ["leg-curl-seated", 3, "10-12"],
      ["calf-raise-standing", 4, "12-15"],
    ],
  },
  {
    key: "upper",
    name: "Upper",
    description: "Chest, back, shoulders, arms",
    exercises: [
      ["bench-press-bb", 3, "6-8"],
      ["bent-over-row-bb", 3, "6-8"],
      ["ohp-bb", 3, "8-10"],
      ["lat-pulldown", 3, "8-12"],
      ["hammer-curl", 2, "10-12"],
      ["skull-crusher", 2, "10-12"],
    ],
  },
  {
    key: "lower",
    name: "Lower",
    description: "Legs and core",
    exercises: [
      ["squat-bb", 3, "6-8"],
      ["rdl-bb", 3, "8-10"],
      ["bulgarian-split", 3, "8-10"],
      ["leg-curl-lying", 3, "10-12"],
      ["calf-raise-seated", 3, "12-15"],
      ["hanging-leg-raise", 3, "10-15"],
    ],
  },
];
