// Einstiegspunkt: React in <div id="root"> mounten.
// StrictMode hilft beim Aufspüren von Side-Effects in Dev.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
