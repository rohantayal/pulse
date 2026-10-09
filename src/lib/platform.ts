import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import type { StateStorage } from "zustand/middleware";

/** True inside the Android app, false in a normal browser. */
export const isNative = Capacitor.isNativePlatform();

/**
 * Where app data lives. In the Android app it goes to native storage (SharedPreferences),
 * which Android's Auto Backup copies to the user's Google Drive and restores after a reinstall.
 * In a browser it stays in localStorage.
 */
export const appStorage: StateStorage = isNative
  ? {
      getItem: async (name) => (await Preferences.get({ key: name })).value,
      setItem: async (name, value) => {
        await Preferences.set({ key: name, value });
      },
      removeItem: async (name) => {
        await Preferences.remove({ key: name });
      },
    }
  : {
      getItem: (name) => {
        try {
          return localStorage.getItem(name);
        } catch {
          return null;
        }
      },
      setItem: (name, value) => {
        try {
          localStorage.setItem(name, value);
        } catch {
          /* storage full or blocked — nothing sensible to do here */
        }
      },
      removeItem: (name) => {
        try {
          localStorage.removeItem(name);
        } catch {
          /* ignore */
        }
      },
    };
