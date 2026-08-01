import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initializeMobileApp } from "./mobile";
import "./styles.css";
import "./navigation.css";
import "./mobile.css";

void initializeMobileApp();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

