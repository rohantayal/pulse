import type { Exercise } from "../types";

type Row = [id: string, name: string, muscle: string, equipment: string];

const ROWS: Row[] = [
  // Chest
  ["bench-press-bb", "Bench Press (Barbell)", "Chest", "Barbell"],
  ["bench-press-db", "Bench Press (Dumbbell)", "Chest", "Dumbbell"],
  ["incline-bench-bb", "Incline Bench Press (Barbell)", "Chest", "Barbell"],
  ["incline-bench-db", "Incline Bench Press (Dumbbell)", "Chest", "Dumbbell"],
  ["decline-bench-bb", "Decline Bench Press (Barbell)", "Chest", "Barbell"],
  ["chest-fly-db", "Chest Fly (Dumbbell)", "Chest", "Dumbbell"],
  ["cable-crossover", "Cable Crossover", "Chest", "Cable"],
  ["pec-deck", "Pec Deck (Machine)", "Chest", "Machine"],
  ["chest-press-machine", "Chest Press (Machine)", "Chest", "Machine"],
  ["push-up", "Push Up", "Chest", "Body weight"],
  ["dips-chest", "Chest Dip", "Chest", "Body weight"],
  // Back
  ["deadlift-bb", "Deadlift (Barbell)", "Back", "Barbell"],
  ["pull-up", "Pull Up", "Back", "Body weight"],
  ["chin-up", "Chin Up", "Back", "Body weight"],
  ["lat-pulldown", "Lat Pulldown (Cable)", "Back", "Cable"],
  ["bent-over-row-bb", "Bent Over Row (Barbell)", "Back", "Barbell"],
  ["db-row", "Dumbbell Row", "Back", "Dumbbell"],
  ["seated-cable-row", "Seated Cable Row", "Back", "Cable"],
  ["t-bar-row", "T-Bar Row", "Back", "Barbell"],
  ["face-pull", "Face Pull (Cable)", "Back", "Cable"],
  ["back-extension", "Back Extension", "Back", "Body weight"],
  ["shrug-db", "Shrug (Dumbbell)", "Back", "Dumbbell"],
  // Shoulders
  ["ohp-bb", "Overhead Press (Barbell)", "Shoulders", "Barbell"],
  ["shoulder-press-db", "Shoulder Press (Dumbbell)", "Shoulders", "Dumbbell"],
  ["arnold-press", "Arnold Press (Dumbbell)", "Shoulders", "Dumbbell"],
  ["lateral-raise-db", "Lateral Raise (Dumbbell)", "Shoulders", "Dumbbell"],
  ["lateral-raise-cable", "Lateral Raise (Cable)", "Shoulders", "Cable"],
  ["front-raise-db", "Front Raise (Dumbbell)", "Shoulders", "Dumbbell"],
  ["rear-delt-fly", "Rear Delt Fly (Dumbbell)", "Shoulders", "Dumbbell"],
  ["upright-row", "Upright Row (Barbell)", "Shoulders", "Barbell"],
  // Arms
  ["bicep-curl-bb", "Bicep Curl (Barbell)", "Biceps", "Barbell"],
  ["bicep-curl-db", "Bicep Curl (Dumbbell)", "Biceps", "Dumbbell"],
  ["hammer-curl", "Hammer Curl (Dumbbell)", "Biceps", "Dumbbell"],
  ["preacher-curl", "Preacher Curl (EZ Bar)", "Biceps", "Barbell"],
  ["cable-curl", "Bicep Curl (Cable)", "Biceps", "Cable"],
  ["tricep-pushdown", "Triceps Pushdown (Cable)", "Triceps", "Cable"],
  ["skull-crusher", "Skull Crusher (EZ Bar)", "Triceps", "Barbell"],
  ["overhead-tricep-db", "Overhead Triceps Extension (Dumbbell)", "Triceps", "Dumbbell"],
  ["close-grip-bench", "Close Grip Bench Press", "Triceps", "Barbell"],
  ["dips-tricep", "Triceps Dip", "Triceps", "Body weight"],
  // Legs
  ["squat-bb", "Squat (Barbell)", "Quadriceps", "Barbell"],
  ["front-squat", "Front Squat (Barbell)", "Quadriceps", "Barbell"],
  ["goblet-squat", "Goblet Squat (Dumbbell)", "Quadriceps", "Dumbbell"],
  ["leg-press", "Leg Press (Machine)", "Quadriceps", "Machine"],
  ["leg-extension", "Leg Extension (Machine)", "Quadriceps", "Machine"],
  ["lunge-db", "Lunge (Dumbbell)", "Quadriceps", "Dumbbell"],
  ["bulgarian-split", "Bulgarian Split Squat", "Quadriceps", "Dumbbell"],
  ["hack-squat", "Hack Squat (Machine)", "Quadriceps", "Machine"],
  ["rdl-bb", "Romanian Deadlift (Barbell)", "Hamstrings", "Barbell"],
  ["leg-curl-lying", "Lying Leg Curl (Machine)", "Hamstrings", "Machine"],
  ["leg-curl-seated", "Seated Leg Curl (Machine)", "Hamstrings", "Machine"],
  ["hip-thrust", "Hip Thrust (Barbell)", "Glutes", "Barbell"],
  ["glute-bridge", "Glute Bridge", "Glutes", "Body weight"],
  ["calf-raise-standing", "Standing Calf Raise (Machine)", "Calves", "Machine"],
  ["calf-raise-seated", "Seated Calf Raise (Machine)", "Calves", "Machine"],
  // Core
  ["plank", "Plank", "Abs", "Body weight"],
  ["crunch", "Crunch", "Abs", "Body weight"],
  ["hanging-leg-raise", "Hanging Leg Raise", "Abs", "Body weight"],
  ["cable-crunch", "Cable Crunch", "Abs", "Cable"],
  ["russian-twist", "Russian Twist", "Abs", "Body weight"],
  ["ab-wheel", "Ab Wheel Rollout", "Abs", "Other"],
  // Full body / cardio
  ["kb-swing", "Kettlebell Swing", "Full body", "Kettlebell"],
  ["clean-and-press", "Clean and Press (Barbell)", "Full body", "Barbell"],
  ["burpee", "Burpee", "Full body", "Body weight"],
  ["farmers-walk", "Farmer's Walk (Dumbbell)", "Full body", "Dumbbell"],
];

export const PRELOADED_EXERCISES: Exercise[] = ROWS.map(([id, name, muscle, equipment]) => ({
  id: `pre:${id}`,
  name,
  muscle,
  equipment,
}));

export const MUSCLES = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quadriceps",
  "Hamstrings", "Glutes", "Calves", "Abs", "Full body", "Cardio", "Other",
];

export const EQUIPMENT = ["Barbell", "Dumbbell", "Machine", "Cable", "Body weight", "Kettlebell", "Band", "Other"];
