import { EXERCISE_MEDIA } from "../data/exerciseMedia";

export interface Media {
  /** start and end position photos, bundled with the app (works offline) */
  frames: [string, string];
  steps: string[];
}

/** Photos + instructions for a built-in exercise, or null (custom exercises, burpee). */
export function mediaFor(ex: { id: string }): Media | null {
  const key = ex.id.startsWith("pre:") ? ex.id.slice(4) : "";
  const m = EXERCISE_MEDIA[key];
  if (!m) return null;
  const url = (i: number) => `${import.meta.env.BASE_URL}exercise-img/${key}-${i}.webp`;
  return { frames: [url(0), url(1)], steps: m.steps };
}
