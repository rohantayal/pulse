import { Health } from "capacitor-health";
import { isNative } from "./platform";
import { toKey } from "./date";

/**
 * Daily steps from Google Health Connect — the hub Google Fit, Samsung Health, Fitbit and most
 * bands write to. Android only; in a browser everything reports "not available".
 */
export type HealthStatus = "unsupported" | "not-installed" | "ready";

export async function healthStatus(): Promise<HealthStatus> {
  if (!isNative) return "unsupported";
  try {
    const { available } = await Health.isHealthAvailable();
    return available ? "ready" : "not-installed";
  } catch {
    return "not-installed";
  }
}

/** Ask for permission to read steps. Resolves true when granted. */
export async function connectSteps(): Promise<boolean> {
  const res = await Health.requestHealthPermissions({ permissions: ["READ_STEPS"] });
  return res.permissions.some((p) => p["READ_STEPS"] === true);
}

export async function stepsGranted(): Promise<boolean> {
  try {
    const res = await Health.checkHealthPermissions({ permissions: ["READ_STEPS"] });
    return res.permissions.some((p) => p["READ_STEPS"] === true);
  } catch {
    return false;
  }
}

/** Steps per local day for the last `days` days (including today). */
export async function readDailySteps(days = 14): Promise<{ date: string; steps: number }[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const { aggregatedData } = await Health.queryAggregated({
    startDate: start.toISOString(),
    endDate: new Date().toISOString(),
    dataType: "steps",
    bucket: "day",
  });
  return aggregatedData.map((b) => ({ date: toKey(new Date(b.startDate)), steps: b.value }));
}

export function openHealthConnect() {
  return Health.openHealthConnectSettings();
}

export function installHealthConnect() {
  return Health.showHealthConnectInPlayStore();
}
