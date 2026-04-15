import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

import { HotkeysProvider } from "@tanstack/react-hotkeys";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HotkeysProvider>
      <App />
    </HotkeysProvider>
  </StrictMode>,
);
