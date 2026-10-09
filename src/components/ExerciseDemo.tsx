import { useEffect, useState } from "react";
import { mediaFor } from "../lib/exerciseMedia";
import { ExerciseAnimation } from "./ExerciseAnimation";
import type { Exercise } from "../types";

/**
 * How the exercise is done: the start and end photos alternate like a GIF. Exercises without
 * photos (custom ones, burpee) show the animated sketch instead.
 */
export function ExerciseDemo({ exercise }: { exercise: Pick<Exercise, "id" | "muscle"> }) {
  const media = mediaFor(exercise);
  const [frame, setFrame] = useState(0);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (!media || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setFrame((f) => 1 - f), 1100);
    return () => window.clearInterval(t);
  }, [media?.frames[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!media || broken) {
    return (
      <div className="overflow-hidden rounded-xl bg-bg/60">
        <ExerciseAnimation exercise={exercise} className="w-full" />
      </div>
    );
  }
  return (
    <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-white">
      {media.frames.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={i === 0 ? "Start position" : "End position"}
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          style={{ opacity: frame === i ? 1 : 0 }}
        />
      ))}
      <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">{frame === 0 ? "Start" : "Finish"}</div>
    </div>
  );
}
