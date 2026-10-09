import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { fromKey, toKey, todayKey } from "../lib/date";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function MonthCalendar({
  value,
  onChange,
  marked,
}: {
  value: string;
  onChange: (key: string) => void;
  /** Days that have something logged get a dot */
  marked?: Set<string>;
}) {
  const v = fromKey(value);
  const [cursor, setCursor] = useState({ y: v.getFullYear(), m: v.getMonth() });
  const first = new Date(cursor.y, cursor.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => toKey(new Date(cursor.y, cursor.m, i + 1))),
  ];
  const today = todayKey();
  const shift = (n: number) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => shift(-1)} className="rounded-full p-2 active:bg-surf2" aria-label="Previous month">
          <ChevronLeft size={20} />
        </button>
        <div className="font-semibold">
          {MONTHS[cursor.m]} {cursor.y}
        </div>
        <button onClick={() => shift(1)} className="rounded-full p-2 active:bg-surf2" aria-label="Next month">
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-tx3">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
        {cells.map((k, i) =>
          k ? (
            <button
              key={k}
              onClick={() => onChange(k)}
              className={clsx(
                "relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm",
                k === value ? "bg-acc font-semibold text-white" : k === today ? "font-semibold text-acc" : "text-tx active:bg-surf2",
              )}
            >
              {fromKey(k).getDate()}
              {marked?.has(k) && k !== value && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-tx2" />}
            </button>
          ) : (
            <div key={i} />
          ),
        )}
      </div>
    </div>
  );
}
