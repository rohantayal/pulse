import { platesFor } from "../lib/plates";
import type { WeightUnit } from "../lib/units";
import { fmt } from "../lib/format";

// Competition colours, so the picture matches the plates on the rack.
const COLOR: Record<string, string> = {
  "kg:25": "#d93a3a",
  "kg:20": "#2f6fd6",
  "kg:15": "#e8c12d",
  "kg:10": "#2e9e5b",
  "kg:5": "#e9e9ea",
  "kg:2.5": "#3a3a3d",
  "kg:1.25": "#9a9aa0",
  "lb:45": "#2f6fd6",
  "lb:35": "#e8c12d",
  "lb:25": "#2e9e5b",
  "lb:10": "#e9e9ea",
  "lb:5": "#3a3a3d",
  "lb:2.5": "#9a9aa0",
};

/** Bar with the plates for one side drawn to scale-ish, and the list underneath. */
export function PlateView({ total, unit }: { total: number; unit: WeightUnit }) {
  const load = platesFor(total, unit);
  const biggest = unit === "kg" ? 25 : 45;
  return (
    <div className="rounded-xl bg-surf2 p-3">
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-semibold">Plates</span>
        <span className="text-xs text-tx2">
          {fmt(load.bar)} {unit} bar
        </span>
      </div>
      {load.belowBar ? (
        <div className="py-3 text-center text-sm text-tx2">
          Lighter than the {fmt(load.bar)} {unit} bar.
        </div>
      ) : (
        <>
          <div className="flex h-20 items-center" aria-hidden>
            {/* bar sleeve */}
            <div className="h-2.5 w-10 rounded-l bg-[#8d8d93]" />
            <div className="h-5 w-1.5 bg-[#8d8d93]" />
            {load.perSide.map((p, i) => (
              <div
                key={i}
                className="mx-[1px] flex items-center justify-center rounded-[3px] text-[9px] font-bold"
                style={{
                  background: COLOR[`${unit}:${p}`] ?? "#777",
                  color: p === 5 && unit === "kg" ? "#111" : p === 10 && unit === "lb" ? "#111" : "#fff",
                  height: `${30 + (p / biggest) * 50}px`,
                  width: p >= biggest * 0.4 ? 16 : 11,
                }}
              >
                <span className="rotate-[-90deg] whitespace-nowrap">{fmt(p, 2)}</span>
              </div>
            ))}
            <div className="h-2.5 flex-1 rounded-r bg-[#8d8d93]/60" />
          </div>
          <div className="mt-1 text-center text-sm">
            {load.perSide.length ? (
              <>
                Each side: <span className="font-semibold tabular-nums">{load.perSide.map((p) => fmt(p, 2)).join(" + ")}</span> {unit}
              </>
            ) : (
              "Just the empty bar"
            )}
          </div>
          {load.leftover > 0 && (
            <div className="mt-1 text-center text-xs text-tx3">
              {fmt(load.leftover, 2)} {unit} can't be made with standard plates
            </div>
          )}
        </>
      )}
    </div>
  );
}
