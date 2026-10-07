import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { seedDemoSession } from "./api/auth";
import "./styles/app.css";

// In mock mode (npm run dev:mock / docker compose dev), enter as a demo user
// right away — no login screen.
seedDemoSession();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
