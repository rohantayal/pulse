import { MuscleFigure, cropFor } from "./MuscleMap";
import { musclesFor, preferredView } from "../lib/muscles";
import type { Exercise } from "../types";

/** Small square picture for an exercise: the body sketch zoomed on the muscles it works. */
export function ExerciseThumb({ exercise, size = 44 }: { exercise?: Pick<Exercise, "id" | "muscle">; size?: number }) {
  const t = exercise ? musclesFor(exercise) : { primary: [], secondary: [] };
  return (
    <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surf2" style={{ width: size, height: size }}>
      <MuscleFigure view={preferredView(t)} targets={t} viewBox={cropFor(t)} className="h-full w-full" />
    </div>
  );
}
