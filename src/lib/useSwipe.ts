import { useRef } from "react";

/**
 * Horizontal swipe detection with pointer events. Ignores mostly-vertical drags so the page
 * can still scroll, and ignores drags that start on inputs.
 */
export function useSwipe(onLeft: () => void, onRight: () => void, threshold = 50) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5 || Date.now() - s.t > 800) return;
      if (dx < 0) onLeft();
      else onRight();
    },
    onMouseDown: (e: React.MouseEvent) => {
      start.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    },
    onMouseUp: (e: React.MouseEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5 || Date.now() - s.t > 800) return;
      if (dx < 0) onLeft();
      else onRight();
    },
  };
}
