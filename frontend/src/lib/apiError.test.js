// P005-007: 서버가 준 거절 사유를 사용자에게 그대로 보여 준다.
import { describe, expect, it } from "vitest";
import { backendErrorMessage } from "./apiError";

describe("backendErrorMessage", () => {
  it("reads message / detail strings", () => {
    expect(backendErrorMessage({ message: "A" })).toBe("A");
    expect(backendErrorMessage({ detail: "B" })).toBe("B");
  });

  it("reads non_field_errors (serializer.validate 의 거절 사유)", () => {
    const data = { non_field_errors: ["해당 차량에 활성 방문권이 있습니다."] };

    expect(backendErrorMessage(data)).toBe("해당 차량에 활성 방문권이 있습니다.");
  });

  it("reads the first field error", () => {
    expect(backendErrorMessage({ valid_hours: ["가능시간은 6, 12, 24 중 하나여야 합니다."] })).toBe(
      "가능시간은 6, 12, 24 중 하나여야 합니다."
    );
  });

  it("returns null when nothing readable", () => {
    expect(backendErrorMessage(undefined)).toBeNull();
    expect(backendErrorMessage({})).toBeNull();
  });
});
