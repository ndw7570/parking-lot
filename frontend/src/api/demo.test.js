// P005-014: 로그인하지 않은 사람이 데모(가짜) 데이터로 둘러본다.
import { beforeEach, describe, expect, it, vi } from "vitest";

// 데모 중에는 실제 서버를 절대 부르지 않아야 한다.
vi.mock("./client", () => {
  const fail = () => Promise.reject(new Error("real server must not be called in demo"));
  return {
    default: { get: fail, post: fail, put: fail, patch: fail, delete: fail },
    tokenStore: {
      access: null,
      refresh: null,
      set({ access, refresh }) {
        this.access = access;
        this.refresh = refresh;
      },
      clear() {
        this.access = null;
        this.refresh = null;
      },
    },
  };
});

import { isDemo } from "./config";
import { authApi } from "./auth";
import { vehicleApi } from "./resources";

describe("demo browsing", () => {
  beforeEach(() => authApi.endDemo());

  it("is off until the visitor asks for it", () => {
    expect(isDemo()).toBe(false);
    expect(authApi.isAuthenticated()).toBe(false);
  });

  it("enters without an account and reads fake data only", async () => {
    await authApi.startDemo();

    expect(isDemo()).toBe(true);
    expect(authApi.isAuthenticated()).toBe(true);
    expect((await vehicleApi.list()).length).toBeGreaterThan(0);
  });

  it("forgets the visitor's edits when the demo ends", async () => {
    await authApi.startDemo();
    const before = (await vehicleApi.list()).length;
    await vehicleApi.create({ plate_number: "99데9999", parking_type: "거주주차" });
    expect((await vehicleApi.list()).length).toBe(before + 1);

    authApi.endDemo();
    await authApi.startDemo();

    expect((await vehicleApi.list()).length).toBe(before);
  });

  it("logging out of the demo ends it", async () => {
    await authApi.startDemo();

    authApi.logout();

    expect(isDemo()).toBe(false);
    expect(authApi.isAuthenticated()).toBe(false);
  });
});
