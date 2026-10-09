import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { isNative } from "./platform";

/** Every piece of user data that goes into a backup file. UI-only state is left out. */
export const DATA_KEYS = [
  "profile",
  "unit",
  "onboarded",
  "checklistDismissed",
  "meals",
  "customFoods",
  "foodLog",
  "recentFoodIds",
  "nutritionGoals",
  "exerciseGoals",
  "weights",
  "steps",
  "customExercises",
  "routines",
  "workouts",
  "active",
  "settings",
  "healthSteps",
] as const;

export interface BackupFile {
  app: "pulse";
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
}

export function makeBackup(state: Record<string, unknown>, now = new Date()): BackupFile {
  const data: Record<string, unknown> = {};
  for (const k of DATA_KEYS) if (state[k] !== undefined) data[k] = state[k];
  return { app: "pulse", version: 1, exportedAt: now.toISOString(), data };
}

/** Parse and sanity-check a backup file. Throws a readable error when it isn't one. */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a Pulse backup (not valid JSON).");
  }
  const b = raw as Partial<BackupFile>;
  if (!b || b.app !== "pulse" || typeof b.data !== "object" || b.data === null) {
    throw new Error("That file isn't a Pulse backup.");
  }
  if (b.version !== 1) throw new Error("This backup was made by a newer version of Pulse. Update the app first.");
  for (const k of ["foodLog", "workouts", "routines", "customFoods", "weights", "steps"]) {
    if (k in b.data && !Array.isArray((b.data as Record<string, unknown>)[k])) throw new Error("The backup file is damaged.");
  }
  return b as BackupFile;
}

/** Summary shown before restoring, so you know what's in the file. */
export function describeBackup(b: BackupFile): string {
  const d = b.data as Record<string, unknown[] | undefined>;
  const n = (k: string) => (Array.isArray(d[k]) ? d[k]!.length : 0);
  const days = new Set((d.foodLog as { date: string }[] | undefined)?.map((e) => e.date) ?? []).size;
  const pl = (x: number, word: string) => `${x} ${word}${x === 1 ? "" : "s"}`;
  return `${pl(n("workouts"), "workout")}, ${pl(days, "day")} of food, ${pl(n("routines"), "routine")}, ${pl(n("customFoods"), "custom food")} — saved ${new Date(b.exportedAt).toLocaleString()}`;
}

export function backupFileName(now = new Date()): string {
  const p = (x: number) => String(x).padStart(2, "0");
  return `pulse-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

/** Save the backup: share sheet on Android (Drive, WhatsApp, Files…), a download in the browser. */
export async function saveBackupFile(b: BackupFile): Promise<void> {
  const name = backupFileName();
  const text = JSON.stringify(b);
  if (isNative) {
    const res = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: "Pulse backup", text: "My Pulse backup", files: [res.uri], dialogTitle: "Save your backup" });
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
