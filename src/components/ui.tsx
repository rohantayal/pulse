import { useEffect, type ReactNode } from "react";
import { ChevronLeft, X } from "lucide-react";
import clsx from "clsx";

export function PageHeader({
  title,
  onBack,
  right,
  subtitle,
}: {
  title: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <header className="pt-safe sticky top-0 z-20 bg-bg/95 backdrop-blur">
      <div className="flex h-14 items-center gap-1 px-2">
        {onBack ? (
          <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full text-tx active:bg-surf2" aria-label="Back">
            <ChevronLeft size={24} />
          </button>
        ) : (
          <div className="w-2" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-semibold">{title}</h1>
          {subtitle && <div className="truncate text-xs text-tx2">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-1 pr-1">{right}</div>
      </div>
    </header>
  );
}

/** A full-screen page that slides over the tab content. */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("fixed inset-0 z-30 flex flex-col bg-bg animate-fade-in", className)}>
      <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-y-auto no-scrollbar">{children}</div>
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  z = "z-50",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  z?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={clsx("fixed inset-0 flex items-end justify-center", z)} role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="pb-safe relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surf animate-slide-up no-scrollbar">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-surf px-5 pb-2 pt-3">
          <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-surf3" />
          <div className="pt-2 text-[17px] font-semibold">{title}</div>
          <button onClick={onClose} className="mt-2 rounded-full p-1.5 text-tx2 active:bg-surf2" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

export function Confirm({
  open,
  title,
  message,
  confirmLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-8" role="alertdialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onCancel} />
      <div className="relative w-full max-w-xs rounded-2xl bg-surf2 p-5 text-center animate-fade-in">
        <div className="text-[17px] font-semibold">{title}</div>
        {message && <p className="mt-2 text-sm text-tx2">{message}</p>}
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className={clsx("h-11 rounded-xl font-semibold", destructive ? "bg-bad/15 text-bad" : "bg-acc text-white")}
          >
            {confirmLabel}
          </button>
          <button onClick={onCancel} className="h-11 rounded-xl bg-surf3 font-medium text-tx">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  className,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition active:scale-[0.98] disabled:opacity-40",
        variant === "primary" && "bg-acc text-white",
        variant === "secondary" && "bg-surf2 text-tx",
        variant === "ghost" && "text-acc",
        variant === "danger" && "bg-bad/15 text-bad",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-tx2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-tx3">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "h-11 w-full rounded-xl bg-surf2 px-3 text-[15px] text-tx placeholder:text-tx3 outline-none ring-acc focus:ring-2";

export function NumberInput({
  value,
  onChange,
  placeholder,
  className,
  step = "any",
  suffix,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  className?: string;
  step?: string;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={clsx(inputCls, suffix && "pr-12", className)}
      />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-tx3">{suffix}</span>}
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  color,
  className,
  redWhenOver,
}: {
  value: number;
  max: number;
  color: string;
  className?: string;
  redWhenOver?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = !!redWhenOver && max > 0 && value > max;
  return (
    <div className={clsx("h-1.5 w-full overflow-hidden rounded-full bg-surf3", className)}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: over ? "#e66767" : color }} />
    </div>
  );
}

export function Ring({
  value,
  max,
  size = 120,
  stroke = 10,
  color,
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2c2c31" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={clsx("rounded-2xl bg-surf p-4", onClick && "cursor-pointer active:bg-surf2", className)}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-tx2">{children}</h2>
      {right}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surf2 text-tx2">{icon}</div>
      <div className="text-[17px] font-semibold">{title}</div>
      {text && <p className="mt-1 text-sm text-tx2">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
