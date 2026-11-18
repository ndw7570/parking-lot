import client, { tokenStore } from "./client";
import { isDemo, MOCK, setDemo } from "./config";
import { mockApi } from "./mock";

const CURRENT_USER_KEY = "pk_current_user";
// 목 me() 가 관리자 역할을 준다. 둘러보는 사람이 모든 기능(가짜 데이터)을 써 볼 수 있게.
const DEMO_USER_ID = "관리자";

export function getCurrentUserId() {
  return localStorage.getItem(CURRENT_USER_KEY) || "";
}

// The logged-in identity used across permission checks. Backend me() returns
// `username`; by our signup convention that equals the user_profile user_id.
export function meIdentity(me) {
  return String(me?.username ?? me?.user_id ?? "");
}
// 관리자는 계정 플래그로만 판정한다. 서버(core/permissions.py)와 같은 기준이어야 한다.
// 아이디에 "관리자"가 들어 있다는 이유로 관리자로 보지 않는다 - 가입 때 누구나 그렇게 지을 수 있다.
// role 은 목(데모) 모드의 me() 만 준다.
export function isAdminUser(me) {
  return Boolean(me?.is_superuser || me?.is_staff || me?.role === "admin" || me?.is_super_admin);
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
    if (isDemo()) {
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
    if (isDemo()) return mockApi.register(payload);
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
    if (isDemo()) {
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
    if (isDemo()) return mockApi.me();
    const { data } = await client.get("/users/me/");
    return data;
  },

  // 둘러보기(P005-014): 계정 없이 가짜 데이터로 들어간다. 매번 새 데모 데이터로 시작한다.
  async startDemo() {
    mockApi.reset();
    setDemo(true);
    await this.login(DEMO_USER_ID, "demo");
  },

  // 둘러보기를 끝낸다. 방문자가 바꾼 가짜 데이터도 지운다.
  // 둘러보기 중이 아니었으면 로그인 정보는 건드리지 않는다(실제 로그인을 지우지 않게).
  endDemo() {
    const wasDemo = isDemo();
    setDemo(false);
    mockApi.reset();
    if (!wasDemo) return;
    tokenStore.clear();
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  logout() {
    if (isDemo()) {
      this.endDemo();
      return;
    }
    tokenStore.clear();
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  isAuthenticated() {
    return Boolean(tokenStore.access);
  },
};
