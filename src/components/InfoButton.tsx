import { Info } from "lucide-react";
import type { MouseEvent } from "react";

/** The ⓘ next to an exercise name — opens its how-to, progress and records. */
export function InfoButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label="Exercise info"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tx2 active:bg-surf3 ${className}`}
    >
      <Info size={18} />
    </button>
  );
}
