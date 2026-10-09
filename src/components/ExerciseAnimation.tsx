import { useEffect, useRef, useState, type ReactElement } from "react";
import { PATTERNS, lerpPose, patternFor, solve, type Prop, type Pt, type Skeleton } from "../lib/motion";
import { musclesFor, type Region } from "../lib/muscles";
import type { Exercise } from "../types";

const LINE = "#d6d6dc";
const FAR = "#7c7c86";
const RED = "#e5484d";
const PROP = "#8f8f99";

const ARM = new Set<Region>(["biceps", "triceps", "forearms"]);
const SHOULDER = new Set<Region>(["frontDelts", "sideDelts", "rearDelts"]);
const LEG = new Set<Region>(["quads", "hamstrings", "glutes", "calves"]);
const TORSO = new Set<Region>(["chest", "abs", "obliques", "lats", "midBack", "lowerBack", "traps"]);

/** Looping sketch of a figure doing the exercise; body parts carrying the main muscles are red. */
export function ExerciseAnimation({ exercise, className }: { exercise: Pick<Exercise, "id" | "muscle">; className?: string }) {
  const pattern = PATTERNS[patternFor(exercise)];
  const period = (pattern.period ?? 2.2) * 1000;
  const [k, setK] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setK(1);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const phase = ((now - t0) % period) / period;
      setK(0.5 - 0.5 * Math.cos(phase * Math.PI * 2)); // ease in/out, A → B → A
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [period]);

  const t = musclesFor(exercise);
  const red = (set: Set<Region>) => t.primary.some((r) => set.has(r));
  const sk = solve(lerpPose(pattern.A, pattern.B, k), pattern.anchor, pattern.at, pattern.scale);
  const props = new Set(pattern.props ?? []);

  const seg = (a: Pt, b: Pt, color: string, w = 6) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w} strokeLinecap="round" />;
  const armC = red(ARM) ? RED : LINE;
  const legC = red(LEG) ? RED : LINE;
  const torsoC = red(TORSO) ? RED : LINE;

  return (
    <svg viewBox="0 0 200 150" className={className} role="img" aria-label="Exercise demonstration">
      <line x1="10" y1="137" x2="190" y2="137" stroke="#34343a" strokeWidth="2" />
      <Props props={props} sk={sk} />
      {/* far side limbs first, dimmer */}
      {seg(sk.hip, sk.knee2, FAR, 5)}
      {seg(sk.knee2, sk.ankle2, FAR, 5)}
      {seg(sk.ankle2, sk.toe2, FAR, 4)}
      {seg(sk.shoulder, sk.elbow2, FAR, 5)}
      {seg(sk.elbow2, sk.hand2, FAR, 5)}
      {/* body */}
      {seg(sk.hip, sk.shoulder, torsoC, 9)}
      {seg(sk.shoulder, sk.head, LINE, 4)}
      <circle cx={sk.head[0]} cy={sk.head[1]} r={8} fill="#0b0b0c" stroke={LINE} strokeWidth={3.5} />
      {seg(sk.hip, sk.knee, legC, 7)}
      {seg(sk.knee, sk.ankle, legC, 6)}
      {seg(sk.ankle, sk.toe, LINE, 4)}
      {seg(sk.shoulder, sk.elbow, armC, 6)}
      {seg(sk.elbow, sk.hand, armC, 5)}
      {red(SHOULDER) && <circle cx={sk.shoulder[0]} cy={sk.shoulder[1]} r={5.5} fill={RED} />}
      <HandProps props={props} sk={sk} />
    </svg>
  );
}

/** Equipment drawn behind the figure (bench, bars, cables). */
function Props({ props, sk }: { props: Set<Prop>; sk: Skeleton }) {
  const out: ReactElement[] = [];
  if (props.has("bench")) {
    out.push(<rect key="bench" x={Math.min(sk.hip[0], sk.shoulder[0]) - 22} y={Math.max(sk.hip[1], sk.shoulder[1]) + 5} width={Math.abs(sk.hip[0] - sk.shoulder[0]) + 40} height={6} rx={2} fill={PROP} />);
    out.push(<line key="bl" x1={sk.hip[0] - 10} y1={Math.max(sk.hip[1], sk.shoulder[1]) + 11} x2={sk.hip[0] - 10} y2={137} stroke={PROP} strokeWidth={4} />);
  }
  if (props.has("incline")) {
    out.push(<line key="inc" x1={sk.hip[0] + 4} y1={sk.hip[1] + 8} x2={sk.shoulder[0] - 6} y2={sk.shoulder[1] + 4} stroke={PROP} strokeWidth={7} strokeLinecap="round" />);
    out.push(<line key="incl" x1={sk.hip[0]} y1={sk.hip[1] + 8} x2={sk.hip[0]} y2={137} stroke={PROP} strokeWidth={4} />);
  }
  if (props.has("seat")) {
    out.push(<rect key="seat" x={sk.hip[0] - 16} y={sk.hip[1] + 5} width={30} height={6} rx={2} fill={PROP} />);
    out.push(<line key="sl" x1={sk.hip[0]} y1={sk.hip[1] + 11} x2={sk.hip[0]} y2={137} stroke={PROP} strokeWidth={4} />);
  }
  if (props.has("pad")) {
    out.push(<rect key="pad" x={sk.knee2[0] - 12} y={sk.ankle2[1] - 2} width={24} height={30} rx={3} fill="#3a3a42" />);
  }
  if (props.has("pullbar")) out.push(<line key="pb" x1={sk.hand[0] - 40} y1={sk.hand[1]} x2={sk.hand[0] + 40} y2={sk.hand[1]} stroke={PROP} strokeWidth={4} strokeLinecap="round" />);
  if (props.has("dipbars")) out.push(<line key="db" x1={sk.hand[0] - 22} y1={sk.hand[1] + 2} x2={sk.hand[0] + 22} y2={sk.hand[1] + 2} stroke={PROP} strokeWidth={5} strokeLinecap="round" />);
  if (props.has("cableUp")) out.push(<line key="cu" x1={sk.hand[0]} y1={sk.hand[1]} x2={sk.hand[0] + 6} y2={4} stroke={PROP} strokeWidth={1.5} strokeDasharray="3 3" />);
  if (props.has("cableFwd")) out.push(<line key="cf" x1={sk.hand[0]} y1={sk.hand[1]} x2={196} y2={sk.hand[1] - 6} stroke={PROP} strokeWidth={1.5} strokeDasharray="3 3" />);
  if (props.has("cableLow")) out.push(<line key="cl" x1={sk.hand[0]} y1={sk.hand[1]} x2={sk.hand[0] + 30} y2={134} stroke={PROP} strokeWidth={1.5} strokeDasharray="3 3" />);
  return <g>{out}</g>;
}

/** Weights held in the hands, drawn on top. */
function HandProps({ props, sk }: { props: Set<Prop>; sk: Skeleton }) {
  const [x, y] = sk.hand;
  if (props.has("bar")) return <circle cx={x} cy={y} r={11} fill="none" stroke={PROP} strokeWidth={4} />;
  if (props.has("db")) return <rect x={x - 7} y={y - 4} width={14} height={8} rx={2} fill={PROP} />;
  if (props.has("kb")) return <circle cx={x} cy={y + 6} r={7} fill={PROP} />;
  if (props.has("wheel")) return <circle cx={x} cy={y + 3} r={8} fill="none" stroke={PROP} strokeWidth={3.5} />;
  return null;
}
