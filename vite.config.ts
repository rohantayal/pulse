import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the same build works in the Android app (file-based) and on the web.
  base: "./",
  define: { __APP_VERSION__: JSON.stringify(process.env.APP_VERSION ?? pkg.version) },
  server: { host: true },
});
