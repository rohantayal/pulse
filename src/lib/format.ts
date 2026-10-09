export function round(n: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

export function fmt(n: number, dp = 0): string {
  return round(n, dp).toLocaleString(undefined, { maximumFractionDigits: dp });
}

export function fmtKg(n: number): string {
  return `${fmt(n, 1)} kg`;
}
