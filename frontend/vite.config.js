import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The backend base is configured through VITE_API_BASE (see .env / docker-compose).
// In dev we also proxy /api and /users to the Django server so there are no CORS issues.
const BACKEND = process.env.BACKEND_ORIGIN || "http://localhost:8000";

// Hosts allowed to reach the dev server (Vite blocks unknown Host headers).
// Extendable via ALLOWED_HOSTS="a.com,b.com"; the DDNS host is allowed by default.
const ALLOWED_HOSTS = [
  "namddww.iptime.org",
  ".iptime.org",
  ...(process.env.ALLOWED_HOSTS || "").split(",").map((h) => h.trim()).filter(Boolean),
];

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ALLOWED_HOSTS,
    proxy: {
      "/api": { target: BACKEND, changeOrigin: true },
      "/users": { target: BACKEND, changeOrigin: true },
    },
  },
});
