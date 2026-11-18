// P005-004: 관리자는 계정 플래그로만 판정한다. 아이디 문자열은 근거가 아니다.
import { describe, expect, it } from "vitest";

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
