import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rohantayal.pulse",
  appName: "Pulse",
  webDir: "dist",
  backgroundColor: "#0b0b0c",
  android: {
    backgroundColor: "#0b0b0c",
  },
  plugins: {
    // Light status-bar icons on our dark background; safe-area sizes are passed to CSS.
    SystemBars: { style: "DARK", insetsHandling: "css" },
    LocalNotifications: { smallIcon: "ic_stat_pulse", iconColor: "#3987e5" },
  },
};

export default config;
