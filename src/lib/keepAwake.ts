import { KeepAwake } from "@capacitor-community/keep-awake";
import { isNative } from "./platform";

/**
 * Stop the screen dimming and locking while a workout is open, so you can tick sets between
 * rests without unlocking the phone. Native plugin in the app, Wake Lock API in a browser.
 */
let webLock: { release: () => Promise<void> } | null = null;

export async function stayAwake(): Promise<void> {
  try {
    if (isNative) return void (await KeepAwake.keepAwake());
    const wl = (navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    if (wl && !webLock) webLock = await wl.request("screen");
  } catch {
    /* not supported — the screen just behaves normally */
  }
}

export async function allowSleep(): Promise<void> {
  try {
    if (isNative) return void (await KeepAwake.allowSleep());
    await webLock?.release();
  } catch {
    /* ignore */
  } finally {
    webLock = null;
  }
}
