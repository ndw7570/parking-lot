// P005-011: 앱(Android)에서만 카메라 번호판 인식을 쓴다. 웹(PWA)에서는 버튼을 숨긴다.
import { beforeEach, describe, expect, it, vi } from "vitest";

const scan = vi.fn();
const isNativePlatform = vi.fn();
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => isNativePlatform() },
  registerPlugin: () => ({ scan: (...a) => scan(...a) }),
}));

import { canScanPlate, scanPlate } from "./plateScanner";

describe("plateScanner", () => {
  beforeEach(() => {
    scan.mockReset();
    isNativePlatform.mockReset();
  });

  it("is available only inside the native app", () => {
    isNativePlatform.mockReturnValue(false);
    expect(canScanPlate()).toBe(false);

    isNativePlatform.mockReturnValue(true);
    expect(canScanPlate()).toBe(true);
  });

  it("returns the recognized plate", async () => {
    scan.mockResolvedValue({ plate: "12가3456" });

    expect(await scanPlate()).toBe("12가3456");
  });

  it("returns null when the user closes the camera", async () => {
    scan.mockRejectedValue(Object.assign(new Error("취소"), { code: "CANCELLED" }));

    expect(await scanPlate()).toBeNull();
  });

  it("rethrows other failures (e.g. camera permission denied)", async () => {
    scan.mockRejectedValue(Object.assign(new Error("권한"), { code: "PERMISSION_DENIED" }));

    await expect(scanPlate()).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });
});
