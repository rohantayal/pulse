import { useState } from "react";
import { fmt } from "../lib/format";

const AXIS = "#6e6e76";
const GRID = "#2c2c31";

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

export interface BarDatum {
  key: string;
  label: string;
  value: number;
}

/** Single-series bar chart with an optional dashed goal line. Tap/hover a bar for its value. */
export function BarChart({ data, goal, color, unit, height = 180 }: { data: BarDatum[]; goal?: number; color: string; unit: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 340;
  const H = height;
  const pad = { l: 36, r: 8, t: 22, b: 22 };
  const max = niceMax(Math.max(goal ?? 0, ...data.map((d) => d.value)) * 1.05);
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const slot = iw / data.length;
  const bw = Math.min(22, slot * 0.55);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const ticks = [0, max / 2, max];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" role="img" aria-label={`Bar chart of ${unit}`} onMouseLeave={() => setHover(null)}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
          <text x={pad.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill={AXIS}>
            {t >= 1000 ? `${fmt(t / 1000, 1)}k` : fmt(t)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = pad.l + slot * i + slot / 2;
        const h = Math.max(0, y(0) - y(d.value));
        const r = Math.min(4, bw / 2, h);
        const x0 = cx - bw / 2;
        const top = y(d.value);
        const path = h > 0 ? `M${x0},${y(0)} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + bw - r} Q${x0 + bw},${top} ${x0 + bw},${top + r} V${y(0)} Z` : "";
        const active = hover === i;
        return (
          <g key={d.key} onMouseEnter={() => setHover(i)} onClick={() => setHover(active ? null : i)} style={{ cursor: "pointer" }}>
            <rect x={pad.l + slot * i} y={pad.t} width={slot} height={ih} fill="transparent" />
            {path && <path d={path} fill={color} opacity={hover == null || active ? 1 : 0.45} />}
            <text x={cx} y={H - 6} textAnchor="middle" fontSize="10" fill={active ? "#f2f2f3" : AXIS}>
              {d.label}
            </text>
            {active && (
              <text x={cx} y={Math.max(12, top - 6)} textAnchor="middle" fontSize="11" fontWeight={600} fill="#f2f2f3">
                {fmt(d.value)}
              </text>
            )}
          </g>
        );
      })}
      {goal != null && goal > 0 && (
        <g pointerEvents="none">
          <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} stroke="#a1a1a8" strokeWidth={1.5} strokeDasharray="4 4" />
          <text x={W - pad.r} y={y(goal) - 4} textAnchor="end" fontSize="10" fill="#a1a1a8">
            Goal {fmt(goal)}
          </text>
        </g>
      )}
    </svg>
  );
}

export interface LinePoint {
  key: string;
  label: string;
  value: number;
}

/** Single-series line chart (e.g. body weight). Tap/hover to read a point. */
export function LineChart({ data, color, unit, height = 200 }: { data: LinePoint[]; color: string; unit: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return null;
  const W = 340;
  const H = height;
  const pad = { l: 40, r: 12, t: 24, b: 22 };
  const vals = data.map((d) => d.value);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi - lo < 2) {
    lo -= 1;
    hi += 1;
  }
  const span = hi - lo;
  lo = Math.floor(lo - span * 0.1);
  hi = Math.ceil(hi + span * 0.1);
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => (data.length === 1 ? pad.l + iw / 2 : pad.l + (i / (data.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - ((v - lo) / (hi - lo)) * ih;
  const ticks = [lo, (lo + hi) / 2, hi];
  const d = data.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
  const labelEvery = Math.ceil(data.length / 6);

  function onMove(e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
    if (clientX == null) return;
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < data.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    setHover(best);
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full touch-pan-y select-none"
      role="img"
      aria-label={`Line chart of ${unit}`}
      onMouseMove={onMove}
      onTouchStart={onMove}
      onTouchMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
          <text x={pad.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill={AXIS}>
            {fmt(t, 1)}
          </text>
        </g>
      ))}
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((p, i) => (
        <g key={p.key}>
          <circle cx={x(i)} cy={y(p.value)} r={hover === i ? 5 : 4} fill={color} stroke="#17171a" strokeWidth={2} />
          {(i % labelEvery === 0 || i === data.length - 1) && (
            <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill={AXIS}>
              {p.label}
            </text>
          )}
        </g>
      ))}
      {hover != null && (
        <g pointerEvents="none">
          <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="#a1a1a8" strokeWidth={1} strokeDasharray="3 3" />
          <rect x={Math.min(W - 92, Math.max(0, x(hover) - 46))} y={2} width={92} height={18} rx={6} fill="#2c2c31" />
          <text x={Math.min(W - 46, Math.max(46, x(hover)))} y={14.5} textAnchor="middle" fontSize="11" fontWeight={600} fill="#f2f2f3">
            {fmt(data[hover].value, 1)} {unit} · {data[hover].label}
          </text>
        </g>
      )}
    </svg>
  );
}
