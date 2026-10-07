import client, { tokenStore } from "./client";
import { MOCK } from "./config";
import { mockApi } from "./mock";

const CURRENT_USER_KEY = "pk_current_user";

export function getCurrentUserId() {
  return localStorage.getItem(CURRENT_USER_KEY) || "";
}

// The logged-in identity used across permission checks. Backend me() returns
// `username`; by our signup convention that equals the user_profile user_id.
export function meIdentity(me) {
  return String(me?.username ?? me?.user_id ?? "");
}
export function isAdminUser(me) {
  return Boolean(
    me?.is_superuser ||
      me?.is_staff ||
      me?.role === "admin" ||
      me?.is_super_admin ||
      me?.username?.includes("관리자")
  );
}

// Demo/mock mode only: seed a session synchronously so the app opens straight
// to Home without the login screen. Mirrors the "데모로 바로 입장" button.
// No-op when mock is off, or when a session already exists.
export function seedDemoSession() {
  if (!MOCK || tokenStore.access) return;
  tokenStore.set({
    access: "mock-access-" + encodeURIComponent("관리자"),
    refresh: "mock-refresh",
  });
  localStorage.setItem(CURRENT_USER_KEY, "관리자");
}

// Verified against the live backend (Django JWT API @ localhost:8000, /schema/):
//   POST /users/auth/login/     { username, password } -> { access, refresh }
//   POST /users/auth/refresh/   { refresh }            -> { access }
//   POST /users/auth/verify/    { token }              -> 200/401
//   POST /users/auth/register/  { username, password } -> 200 (no body)
//   GET  /users/me/             (Bearer)               -> current user
// NOT on the backend yet: password change, logout (JWT is stateless — logout
// is client-side token clear). See changePassword() below.
export const authApi = {
  async login(username, password) {
    const normalized = String(username || "").trim();
    if (MOCK) {
      const data = await mockApi.login(normalized, password);
      tokenStore.set({ access: data.access, refresh: data.refresh });
      if (normalized) localStorage.setItem(CURRENT_USER_KEY, normalized);
      return data;
    }
    const { data } = await client.post("/users/auth/login/", {
      username: normalized,
      password,
    });
    tokenStore.set({ access: data.access, refresh: data.refresh });
    if (normalized) localStorage.setItem(CURRENT_USER_KEY, normalized);
    return data;
  },

  async register(payload) {
    if (MOCK) return mockApi.register(payload);
    const { data } = await client.post("/users/auth/register/", payload);
    // Register returns { access, refresh } — log in immediately so the signup
    // flow can create the user_profile with the new token.
    if (data?.access) {
      tokenStore.set({ access: data.access, refresh: data.refresh });
      if (payload.username) localStorage.setItem(CURRENT_USER_KEY, payload.username);
    }
    return data;
  },

  // POST /users/auth/password/  { current_password, new_password }  (auth required)
  // The Bearer token (client.js interceptor) identifies the user — no username.
  async changePassword({ current_password, new_password } = {}) {
    if (MOCK) {
      return mockApi.changePassword({
        username: getCurrentUserId(),
        current_password,
        new_password,
      });
    }
    const { data } = await client.post("/users/auth/password/", {
      current_password,
      new_password,
    });
    return data;
  },

  async me() {
    if (MOCK) return mockApi.me();
    const { data } = await client.get("/users/me/");
    return data;
  },

  logout() {
    tokenStore.clear();
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  isAuthenticated() {
    return Boolean(tokenStore.access);
  },
};
