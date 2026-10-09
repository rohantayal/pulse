import { useRef, useState } from "react";
import { Download, Scale, Upload, UserRound } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store/app";
import { useUi } from "../store/ui";
import { isNative } from "../lib/platform";
import { describeBackup, makeBackup, parseBackup, saveBackupFile, type BackupFile } from "../lib/backup";
import { Button, Card, Confirm, PageHeader, Screen, SectionTitle } from "../components/ui";

function ago(ts?: number) {
  if (!ts) return "never";
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

export function SettingsPage() {
  const { pop, push, showToast } = useUi();
  const unit = useApp((s) => s.unit);
  const lastBackupAt = useApp((s) => s.lastBackupAt);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function exportNow() {
    try {
      await saveBackupFile(makeBackup(useApp.getState() as unknown as Record<string, unknown>));
      useApp.getState().markBackedUp();
    } catch {
      /* share sheet dismissed */
    }
  }

  async function pickFile(file: File) {
    try {
      setPending(parseBackup(await file.text()));
    } catch (e) {
      showToast((e as Error).message);
    }
  }

  return (
    <Screen>
      <PageHeader title="Settings" onBack={pop} />
      <div className="px-3 pb-12">
        <SectionTitle>Units</SectionTitle>
        <Card className="flex items-center gap-3">
          <Scale size={20} className="text-tx2" />
          <div className="flex-1 font-medium">Weight</div>
          <div className="flex rounded-lg bg-surf2 p-0.5 text-sm font-medium">
            {(["kg", "lb"] as const).map((u) => (
              <button key={u} onClick={() => useApp.getState().setUnit(u)} className={clsx("rounded-md px-4 py-1.5", unit === u ? "bg-acc text-white" : "text-tx2")}>
                {u}
              </button>
            ))}
          </div>
        </Card>

        <SectionTitle>Backup</SectionTitle>
        <Card>
          <div className="text-sm text-tx2">
            {isNative
              ? "Android backs the app up to your Google Drive about once a day and restores it if you reinstall. For an instant copy, export a backup file."
              : "Your data lives in this browser. Export a backup file to keep it safe or move it to the app."}
          </div>
          <div className="mt-1 text-xs text-tx3">Last backup file: {ago(lastBackupAt)}</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={exportNow}>
              <Download size={16} /> Export
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Restore
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void pickFile(f);
            }}
          />
        </Card>

        <SectionTitle>Plan</SectionTitle>
        <Card onClick={() => push({ kind: "onboarding" })} className="flex items-center gap-3">
          <UserRound size={20} className="text-tx2" />
          <div className="flex-1 font-medium">Set up my plan again</div>
        </Card>

        <p className="mt-8 text-center text-xs text-tx3">Pulse {__APP_VERSION__}</p>
      </div>

      <Confirm
        open={!!pending}
        title="Restore this backup?"
        message={pending ? `${describeBackup(pending)}. This replaces everything currently in the app.` : undefined}
        confirmLabel="Replace my data"
        destructive
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) useApp.getState().restoreData(pending.data);
          setPending(null);
          showToast("Backup restored");
          pop();
        }}
      />
    </Screen>
  );
}
