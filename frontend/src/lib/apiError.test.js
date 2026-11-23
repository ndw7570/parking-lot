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

// 상황에 맞는 오류 문장 (ECC error-handling: 사용자 문장 ≠ 개발자 문장, 코드별 문장 한 곳).
import { errorMessage, errorCode, logError } from "./apiError";
import { vi } from "vitest";

const httpErr = (status, data) => ({ response: { status, data } });

describe("errorCode", () => {
  it("prefers the server error code", () => {
    expect(errorCode(httpErr(409, { error: { code: "ALREADY_OPEN" } }))).toBe("ALREADY_OPEN");
  });

  it("falls back to the HTTP status", () => {
    expect(errorCode(httpErr(401))).toBe("NOT_AUTHENTICATED");
    expect(errorCode(httpErr(403))).toBe("PERMISSION_DENIED");
    expect(errorCode(httpErr(413))).toBe("TOO_LARGE");
    expect(errorCode(httpErr(502))).toBe("SERVER_ERROR");
  });

  it("tells a network failure from a timeout", () => {
    expect(errorCode({ request: {}, message: "Network Error" })).toBe("NETWORK");
    expect(errorCode({ code: "ECONNABORTED" })).toBe("TIMEOUT");
  });
});

describe("errorMessage", () => {
  const FALLBACK = "저장하지 못했습니다.";

  it("shows the business reason the server wrote for people", () => {
    const err = httpErr(409, { error: { code: "ALREADY_OPEN", message: "이미 주차 중으로 접수된 차량입니다." } });

    expect(errorMessage(err, FALLBACK)).toBe("이미 주차 중으로 접수된 차량입니다.");
  });

  it("names the field and rewrites raw Django wording", () => {
    const err = httpErr(400, {
      plate_number: ["vehicle의 plate number은/는 이미 존재합니다."],
      error: { code: "VALIDATION_ERROR" },
    });

    expect(errorMessage(err, FALLBACK)).toBe("차량번호: 이미 등록되어 있습니다.");
  });

  it("explains a too-long value with its limit", () => {
    const err = httpErr(400, { plate_number: ["이 필드의 글자 수가 200 이하인지 확인하십시오."] });

    expect(errorMessage(err, FALLBACK)).toBe("차량번호: 200자 이하로 입력해 주세요.");
  });

  it("asks to log in again when the session expired", () => {
    expect(errorMessage(httpErr(401), FALLBACK)).toBe("로그인이 만료되었습니다. 다시 로그인해 주세요.");
  });

  it("says permission instead of a generic failure", () => {
    expect(errorMessage(httpErr(403, { detail: "이 데이터를 바꿀 권한이 없습니다." }), FALLBACK)).toBe(
      "이 작업을 할 권한이 없습니다. 관리자에게 문의해 주세요."
    );
  });

  it("separates server trouble from the user's network", () => {
    expect(errorMessage(httpErr(500, { error: { code: "SERVER_ERROR" } }), FALLBACK)).toBe(
      "서버에 문제가 생겨 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (오류 500)"
    );
    expect(errorMessage({ request: {}, message: "Network Error" }, FALLBACK)).toBe(
      "서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요."
    );
  });

  it("never shows HTML or stack traces from a proxy error page", () => {
    const err = httpErr(502, "<html><body>502 Bad Gateway nginx</body></html>");

    expect(errorMessage(err, FALLBACK)).not.toMatch(/html|nginx/i);
  });

  it("uses the screen's fallback when nothing is known", () => {
    expect(errorMessage(undefined, FALLBACK)).toBe(FALLBACK);
    expect(errorMessage(httpErr(400, {}), FALLBACK)).toBe(FALLBACK);
  });
});

describe("logError", () => {
  it("records the code, status and server body for developers", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logError("unauthorized-create", httpErr(409, { error: { code: "ALREADY_OPEN" } }));

    expect(spy).toHaveBeenCalledWith("[unauthorized-create]", "ALREADY_OPEN", 409, { error: { code: "ALREADY_OPEN" } });
    spy.mockRestore();
  });
});

describe("errorMessage edge cases", () => {
  it("keeps a plain server detail when there is no field error", () => {
    expect(errorMessage(httpErr(400, { detail: "같은 값의 데이터가 이미 있어 복구할 수 없습니다." }), "x")).toBe(
      "같은 값의 데이터가 이미 있어 복구할 수 없습니다."
    );
  });

  it("shows a non-field reason without a label", () => {
    expect(errorMessage(httpErr(400, { non_field_errors: ["해당 차량에 활성 방문권이 있습니다."] }), "x")).toBe(
      "해당 차량에 활성 방문권이 있습니다."
    );
  });

  it("reports a timeout separately", () => {
    expect(errorMessage({ code: "ECONNABORTED" }, "x")).toBe("서버 응답이 늦습니다. 잠시 후 다시 시도해 주세요.");
  });

  it("rewrites a required-field message", () => {
    expect(errorMessage(httpErr(400, { parking_location: ["이 필드는 null일 수 없습니다."] }), "x")).toBe(
      "주차 위치: 꼭 입력해야 합니다."
    );
  });
});
