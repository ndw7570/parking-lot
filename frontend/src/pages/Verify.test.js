import { describe, expect, it } from "vitest";
import { verdictFromType } from "./Verify.jsx";
import { PARKING_TYPE, VERDICT } from "../lib/domain";

// P005-031: 권한 확인 판정 카드도 목록·상세와 같은 이름("거주주차")을 쓴다.
describe("verdictFromType", () => {
  it.each([PARKING_TYPE.RESIDENT, PARKING_TYPE.DESIGNATED])("%s → 거주주차(허용)", (type) => {
    const v = verdictFromType(type);
    expect(v.verdict).toBe(VERDICT.DESIGNATED);
    expect(v.label).toBe("거주주차");
    expect(v.allowed).toBe(true);
  });
});
