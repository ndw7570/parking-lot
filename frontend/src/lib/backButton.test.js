// P005-016: Android 뒤로가기. 상세 -> 이전, 탭 -> 홈, 홈 -> "한 번 더" 후 백그라운드.
import { describe, expect, it } from "vitest";
import { decideBack, EXIT_WINDOW_MS } from "./backButton";

const at = (path, extra = {}) => ({ path, canGoBack: true, lastBackAt: 0, now: 10_000, ...extra });

describe("decideBack", () => {
  it("detail screens go back one step", () => {
    expect(decideBack(at("/vehicles/3"))).toBe("history");
    expect(decideBack(at("/verify"))).toBe("history");
  });

  it("a detail screen opened directly (no history) goes home", () => {
    expect(decideBack(at("/vehicles/3", { canGoBack: false }))).toBe("home");
  });

  it("other tabs go to home instead of walking back through tabs", () => {
    for (const tab of ["/vehicles", "/residents", "/unauthorized", "/board"]) {
      expect(decideBack(at(tab))).toBe("home");
    }
  });

  it("home asks once before leaving", () => {
    expect(decideBack(at("/"))).toBe("confirm");
  });

  it("home leaves on a second press within the window", () => {
    expect(decideBack(at("/", { lastBackAt: 10_000 - EXIT_WINDOW_MS + 1 }))).toBe("exit");
  });

  it("home asks again if the second press is too late", () => {
    expect(decideBack(at("/", { lastBackAt: 10_000 - EXIT_WINDOW_MS - 1 }))).toBe("confirm");
  });

  it("the login screen behaves like home (nothing to go back to)", () => {
    expect(decideBack(at("/login"))).toBe("confirm");
  });
});
