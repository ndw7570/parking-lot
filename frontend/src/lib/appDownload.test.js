// P005-015: 웹에 로그인한 사람이 Android 앱(APK)을 받는다.
import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
const isNativePlatform = vi.fn();
vi.mock("../api/client", () => ({ default: { post: (...a) => post(...a) } }));
vi.mock("../api/config", () => ({ isDemo: () => false }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => isNativePlatform() } }));

import { canDownloadAndroidApp, androidAppDownloadUrl } from "./appDownload";

describe("appDownload", () => {
  beforeEach(() => {
    post.mockReset();
    isNativePlatform.mockReset();
  });

  it("is offered on the web, not inside the app itself", () => {
    isNativePlatform.mockReturnValue(false);
    expect(canDownloadAndroidApp()).toBe(true);

    isNativePlatform.mockReturnValue(true);
    expect(canDownloadAndroidApp()).toBe(false);
  });

  it("asks the server for a short-lived signed link", async () => {
    post.mockResolvedValue({ data: { url: "/api/app/android/download/?t=abc" } });

    const url = await androidAppDownloadUrl();

    expect(post).toHaveBeenCalledWith("/api/app/android/link/");
    expect(url).toBe("/api/app/android/download/?t=abc");
  });
});
