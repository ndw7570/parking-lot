// P005-004: 관리자는 계정 플래그로만 판정한다. 아이디 문자열은 근거가 아니다.
import { describe, expect, it, vi } from "vitest";

// auth.js -> mock.js 가 불러오는 순간 localStorage 를 읽는다. Node 테스트 환경에는 없다.
vi.hoisted(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

import { isAdminUser } from "./auth";

describe("isAdminUser", () => {
  it("trusts is_staff / is_superuser", () => {
    expect(isAdminUser({ username: "kim", is_staff: true })).toBe(true);
    expect(isAdminUser({ username: "kim", is_superuser: true })).toBe(true);
  });

  it("does not trust a username containing 관리자", () => {
    expect(isAdminUser({ username: "관리자김씨", is_staff: false })).toBe(false);
  });

  it("keeps demo admin working (mock me() returns role: admin)", () => {
    expect(isAdminUser({ username: "관리자(데모)", role: "admin", is_mock: true })).toBe(true);
  });

  it("is false for no user", () => {
    expect(isAdminUser(null)).toBe(false);
  });
});
