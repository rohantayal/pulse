import { useState } from "react";
import { MuscleFigure, cropFor } from "./MuscleMap";
import { musclesFor, preferredView } from "../lib/muscles";
import { mediaFor } from "../lib/exerciseMedia";
import type { Exercise } from "../types";

/** Small square picture for an exercise: its photo, or the muscle sketch when there's no photo. */
export function ExerciseThumb({ exercise, size = 44 }: { exercise?: Pick<Exercise, "id" | "muscle">; size?: number }) {
  const media = exercise ? mediaFor(exercise) : null;
  const [broken, setBroken] = useState(false);
  const t = exercise ? musclesFor(exercise) : { primary: [], secondary: [] };
  return (
    <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surf2" style={{ width: size, height: size }}>
      {media && !broken ? (
        <img src={media.frames[0]} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} className="h-full w-full object-cover" />
      ) : (
        <MuscleFigure view={preferredView(t)} targets={t} viewBox={cropFor(t)} className="h-full w-full" />
      )}
    </div>
  );
}
