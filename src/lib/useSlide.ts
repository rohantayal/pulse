import { useRef, useState, type CSSProperties, type PointerEvent, type MouseEvent } from "react";

const DURATION = 260;
const EASE = "cubic-bezier(.2,.8,.2,1)";

/**
 * Horizontal swipe that follows the finger and slides between pages.
 *
 * Drag sideways: the content moves with you. Let go past ~25% of the width (or flick) and the
 * current page slides out, `commit` swaps the content, and the new page slides in from the other
 * side. Otherwise it springs back. Vertical drags are left to the browser (touch-action: pan-y),
 * so the page still scrolls normally.
 */
export function useSlide() {
  const ref = useRef<HTMLDivElement>(null);
  const [x, setXState] = useState(0);
  const xRef = useRef(0);
  const setX = (v: number) => {
    xRef.current = v;
    setXState(v);
  };
  const [animating, setAnimating] = useState(false);
  const [dur, setDur] = useState(DURATION);
  const drag = useRef<{ id: number; x0: number; y0: number; t0: number; mode: "?" | "h" | "v" } | null>(null);
  const moved = useRef(false);
  const busy = useRef(false);
  const commitRef = useRef<(dir: 1 | -1) => void>(() => {});

  const width = () => ref.current?.offsetWidth || window.innerWidth;

  /**
   * Slide out towards `dir` (1 = next, content leaves to the left), run `commit`, slide the new
   * page in. The exit only takes as long as the distance left (a finger may already have dragged
   * it most of the way), so the new page follows straight on with no empty gap.
   */
  function slideTo(dir: 1 | -1, commit: () => void) {
    if (busy.current) return;
    busy.current = true;
    const w = width();
    const remaining = Math.max(0, w - Math.abs(xRef.current)) / w;
    const outDur = Math.round(Math.max(90, 200 * remaining));
    setDur(outDur);
    setAnimating(true);
    setX(-dir * w);
    window.setTimeout(() => {
      commit();
      setAnimating(false);
      setX(dir * w * 0.6);
      // two frames so the browser paints the new page off-screen before animating it in
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setDur(DURATION);
          setAnimating(true);
          setX(0);
          window.setTimeout(() => {
            setAnimating(false);
            busy.current = false;
          }, DURATION);
        }),
      );
    }, outDur);
  }

  const handlers = {
    onPointerDown: (e: PointerEvent) => {
      if (busy.current || (e.pointerType === "mouse" && e.button !== 0)) return;
      drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), mode: "?" };
      moved.current = false;
    },
    onPointerMove: (e: PointerEvent) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x0;
      const dy = e.clientY - d.y0;
      if (d.mode === "?") {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        d.mode = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        if (d.mode === "h") (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      }
      if (d.mode !== "h") return;
      moved.current = true;
      setAnimating(false);
      setX(dx);
    },
    onPointerUp: (e: PointerEvent) => {
      const d = drag.current;
      drag.current = null;
      if (!d || d.mode !== "h") return;
      const dx = e.clientX - d.x0;
      const velocity = Math.abs(dx) / Math.max(1, performance.now() - d.t0); // px per ms
      // Far enough, or a real flick (fast and not just a nudge)
      if (Math.abs(dx) > width() * 0.25 || (velocity > 0.6 && Math.abs(dx) > 60)) {
        const dir: 1 | -1 = dx < 0 ? 1 : -1;
        slideTo(dir, () => commitRef.current(dir));
      } else {
        setDur(DURATION);
        setAnimating(true);
        setX(0);
        window.setTimeout(() => setAnimating(false), DURATION);
      }
    },
    onPointerCancel: () => {
      drag.current = null;
      setAnimating(true);
      setX(0);
      window.setTimeout(() => setAnimating(false), DURATION);
    },
    // A drag shouldn't also count as a tap on whatever was under the finger.
    onClickCapture: (e: MouseEvent) => {
      if (moved.current) {
        e.preventDefault();
        e.stopPropagation();
        moved.current = false;
      }
    },
  };

  const style: CSSProperties = {
    transform: `translate3d(${x}px,0,0)`,
    transition: animating ? `transform ${dur}ms ${EASE}` : "none",
    touchAction: "pan-y",
    willChange: "transform",
    // dragging shouldn't highlight text along the way
    userSelect: "none",
    WebkitUserSelect: "none",
  };

  return {
    ref,
    style,
    handlers,
    slideTo,
    /** What a completed swipe does (1 = next, -1 = previous). */
    onSwipe: (fn: (dir: 1 | -1) => void) => {
      commitRef.current = fn;
    },
  };
}
