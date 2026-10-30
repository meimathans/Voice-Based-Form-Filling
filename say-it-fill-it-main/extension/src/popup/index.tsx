import React from "react";
import { createRoot } from "react-dom/client";
import { PopupApp } from "./PopupApp";
import "./popup.css";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <PopupApp />
    </React.StrictMode>
  );
}
