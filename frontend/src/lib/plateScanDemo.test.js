// P005-019: 웹 데모의 번호판 인식 체험. 실제 앱 화면과 같은 순서로 문구가 바뀌어야 한다.
import { describe, expect, it } from "vitest";
import { DEMO_PLATE, demoScanTimeline } from "./plateScanDemo";

describe("demoScanTimeline", () => {
  it("searches first, then counts up to the confirm threshold like the app", () => {
    const steps = demoScanTimeline(DEMO_PLATE, 3);

    expect(steps.map((s) => s.status)).toEqual([
      "",
      "번호판을 찾는 중…",
      `${DEMO_PLATE}  확인 중 1/3`,
      `${DEMO_PLATE}  확인 중 2/3`,
      `${DEMO_PLATE}  확인 중 3/3`,
    ]);
  });

  it("turns the corners green only once the plate is read", () => {
    const steps = demoScanTimeline(DEMO_PLATE, 3);

    expect(steps.map((s) => s.detected)).toEqual([false, false, true, true, true]);
  });

  it("uses a plate that exists in the demo data so the lookup has a result", () => {
    expect(DEMO_PLATE).toBe("12가3456");
  });
});
