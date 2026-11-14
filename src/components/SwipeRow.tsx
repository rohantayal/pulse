import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Trash2 } from "lucide-react";

/**
 * Swipe left to delete. The row follows your finger over a red "Delete" strip; let go past
 * ~40% of its width (or flick) and it slides away and `onDelete` runs — pair it with an Undo
 * toast. Vertical scrolling is left to the page, and drags that start on a text field are ignored
 * so typing still works. A left swipe on the row is the row's alone — it never reaches a parent
 * swipe area — while right swipes pass through (on Today that still means "previous day").
 */
export function SwipeRow({
  children,
  onDelete,
  className = "",
  bg = "bg-surf",
}: {
  children: ReactNode;
  onDelete: () => void;
  className?: string;
  /** the row's own background, so the red strip only shows where you've swiped */
  bg?: string;
}) {
  const [x, setX] = useState(0);
  const [anim, setAnim] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x0: number; y0: number; t0: number; mode: "?" | "h" | "v" } | null>(null);
  const moved = useRef(false);

  const reset = () => {
    setAnim(true);
    setX(0);
  };

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 flex items-center justify-end bg-bad pr-5 text-sm font-semibold text-white" aria-hidden={x === 0}>
        <Trash2 size={16} className="mr-1.5" /> Delete
      </div>
      <div
        className={`relative ${bg}`}
        style={{ transform: `translate3d(${x}px,0,0)`, transition: anim ? "transform 200ms ease" : "none", touchAction: "pan-y" }}
        onPointerDown={(e: PointerEvent) => {
          const tag = (e.target as HTMLElement).tagName;
          if (tag === "INPUT" || tag === "TEXTAREA") return;
          drag.current = { x0: e.clientX, y0: e.clientY, t0: performance.now(), mode: "?" };
          moved.current = false;
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x0;
          const dy = e.clientY - d.y0;
          if (d.mode === "?") {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            d.mode = Math.abs(dx) > Math.abs(dy) && dx < 0 ? "h" : "v";
            if (d.mode === "h") (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          }
          if (d.mode !== "h") return;
          // this row owns the gesture: don't let a parent swipe (e.g. change day) move too
          e.stopPropagation();
          moved.current = true;
          setAnim(false);
          setX(Math.min(0, dx));
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          // (pointerup still bubbles so a parent swipe area can clear its own drag state)
          if (!d || d.mode !== "h") return;
          const dx = e.clientX - d.x0;
          const w = ref.current?.offsetWidth ?? 300;
          const fast = Math.abs(dx) / Math.max(1, performance.now() - d.t0) > 0.6 && dx < -60;
          if (dx < -w * 0.4 || fast) {
            setAnim(true);
            setX(-w);
            window.setTimeout(() => {
              onDelete();
              setAnim(false);
              setX(0);
            }, 180);
          } else reset();
        }}
        onPointerCancel={() => {
          drag.current = null;
          reset();
        }}
        onClickCapture={(e) => {
          if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
            moved.current = false;
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
