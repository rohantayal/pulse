import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "./index.css";
import App from "./App";
import { useApp } from "./store/app";
import { useUi } from "./store/ui";

// Dev builds only: lets screenshot scripts open any page directly.
if (import.meta.env.DEV) Object.assign(window, { __pulse: { app: useApp, ui: useUi } });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
