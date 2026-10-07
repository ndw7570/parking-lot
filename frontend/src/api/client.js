import axios from "axios";

// Base origin of the Django backend.
// - In dev, Vite proxies /api and /users, so leaving this empty is fine.
// - In docker/prod, set VITE_API_BASE (e.g. http://localhost:8000).
const API_BASE = import.meta.env.VITE_API_BASE || "";

// Token storage keys
const ACCESS_KEY = "pk_access";
const REFRESH_KEY = "pk_refresh";

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set({ access, refresh }) {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

const client = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// ---------------------------------------------------------------- API logger
// Dev-only: prints every request / response / error to the console so you can
// see exactly what the frontend sends and what the backend returns.
//   - ON automatically with `npm run dev` (off in production builds).
//   - Silence:  localStorage.setItem("pk_api_log", "0")  then reload.
const API_LOG =
  import.meta.env.DEV && localStorage.getItem("pk_api_log") !== "0";
const method = (c) => (c?.method || "get").toUpperCase();

function logReq(config) {
  if (!API_LOG) return;
  console.log(`%c→ ${method(config)} ${config.url}`, "color:#0a7", config.data ?? "");
}
function logRes(res) {
  if (!API_LOG) return;
  console.log(`%c← ${res.status} ${method(res.config)} ${res.config.url}`, "color:#0a7", res.data);
}
function logErr(error) {
  if (!API_LOG) return;
  const label = error.response?.status ?? error.code ?? "ERR";
  console.error(
    `%c✕ ${label} ${method(error.config)} ${error.config?.url}`,
    "color:#e33",
    error.response?.data ?? error.message
  );
}

// Attach access token to every request
client.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  logReq(config);
  return config;
});

// On 401, try a single refresh, then replay the original request.
let refreshing = null;
client.interceptors.response.use(
  (res) => {
    logRes(res);
    return res;
  },
  async (error) => {
    logErr(error);
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && !original._retry && tokenStore.refresh) {
      original._retry = true;
      try {
        refreshing =
          refreshing ||
          axios.post(`${API_BASE}/users/auth/refresh/`, {
            refresh: tokenStore.refresh,
          });
        const { data } = await refreshing;
        refreshing = null;
        tokenStore.set({ access: data.access });
        original.headers.Authorization = `Bearer ${data.access}`;
        return client(original);
      } catch (e) {
        refreshing = null;
        tokenStore.clear();
        if (typeof window !== "undefined") window.location.assign("/login");
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

export default client;
