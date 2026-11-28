import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { setupVitePreloadErrorRecovery } from "@/shared/pwa/vitePreloadErrorRecovery";
// Phase 2: 프리셋 레지스트리 + Wizard 시드 포트 등록
import "@/app/presets/presetRegistry";
import "@/app/onboarding/organizationPresetSeed";

setupVitePreloadErrorRecovery();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
