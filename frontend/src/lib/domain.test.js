// P005-005: 만료된 방문 티켓은 방문 판정 근거가 될 수 없다 (B-08).
import { describe, expect, it } from "vitest";
import { buildMyOverview, decideVerdict, hasActiveTicket, PARKING_TYPE, plateSearchParams, VERDICT } from "./domain";

const NOW = new Date("2026-11-18T12:00:00+09:00");
const minutesFromNow = (m) => new Date(NOW.getTime() + m * 60000).toISOString();

const vehicle = (extra = {}) => ({ vehicle_id: 7, user: null, parking_type: PARKING_TYPE.VISITOR, ...extra });
const ticket = (endInMinutes, extra = {}) => ({
  vehicle: 7,
  parking_end_time: minutesFromNow(endInMinutes),
  ...extra,
});

describe("hasActiveTicket", () => {
  it("is true while the ticket has not ended", () => {
    expect(hasActiveTicket(7, [ticket(30)], NOW)).toBe(true);
  });

  it("is false once the ticket ended", () => {
    expect(hasActiveTicket(7, [ticket(-1)], NOW)).toBe(false);
  });

  it("ignores tickets of other vehicles", () => {
    expect(hasActiveTicket(7, [ticket(30, { vehicle: 8 })], NOW)).toBe(false);
  });

  it("treats a ticket without end time as inactive (서버 중복 검사와 같은 기준)", () => {
    expect(hasActiveTicket(7, [{ vehicle: 7, parking_end_time: null, valid_hours: 6 }], NOW)).toBe(false);
  });

  it("ignores soft-deleted tickets", () => {
    expect(hasActiveTicket(7, [ticket(30, { is_deleted: true })], NOW)).toBe(false);
  });
});

// P005-010: 마이페이지 "거주 호수 / 보유 차량"을 실제 데이터로.
describe("buildMyOverview", () => {
  const dongHos = [
    { dong_ho_id: 1, dong_ho_name: "801호", user: "me" },
    { dong_ho_id: 2, dong_ho_name: "802호", user: "other" },
  ];
  const vehicles = [
    { vehicle_id: 1, plate_number: "11가1111", user: "me", parking_type: PARKING_TYPE.RESIDENT },
    { vehicle_id: 2, plate_number: "22나2222", user: "me", parking_type: PARKING_TYPE.VISITOR },
    { vehicle_id: 3, plate_number: "33다3333", user: "other", parking_type: PARKING_TYPE.RESIDENT },
  ];

  it("finds my unit and my own vehicles, not the visitors I host", () => {
    const ov = buildMyOverview("me", dongHos, vehicles);

    expect(ov.dong_ho_name).toBe("801호");
    expect(ov.vehicles.map((v) => v.plate_number)).toEqual(["11가1111"]);
  });

  it("returns empty overview when nothing is linked", () => {
    expect(buildMyOverview("nobody", dongHos, vehicles)).toEqual({ dong_ho_name: null, vehicles: [] });
  });
});

describe("decideVerdict", () => {
  it("visitor with an active ticket → 방문주차", () => {
    expect(decideVerdict(vehicle(), [ticket(60)], NOW).verdict).toBe(VERDICT.VISITOR);
  });

  it("visitor whose only ticket expired → 무단주차 (방문 시간 만료)", () => {
    const result = decideVerdict(vehicle(), [ticket(-5)], NOW);

    expect(result.verdict).toBe(VERDICT.UNAUTHORIZED);
    expect(result.sub).toContain("만료");
  });

  it("visitor vehicle carries the host as user - expired is still not 지정주차", () => {
    // VehicleForm 은 방문 차량의 user 에 호스트(등록한 거주민) 아이디를 넣는다.
    const hosted = vehicle({ user: "resident1" });

    expect(decideVerdict(hosted, [ticket(-5)], NOW).verdict).toBe(VERDICT.UNAUTHORIZED);
  });

  it("tickets unknown (fetch failed) → does not accuse the visitor", () => {
    const result = decideVerdict(vehicle(), null, NOW);

    expect(result.verdict).toBe(VERDICT.VISITOR);
    expect(result.sub).toContain("확인 실패");
  });

  it("owner vehicle without ticket → 지정주차", () => {
    const owned = vehicle({ user: "resident1", parking_type: PARKING_TYPE.DESIGNATED });

    expect(decideVerdict(owned, [], NOW).verdict).toBe(VERDICT.DESIGNATED);
  });

  // P005-031: 같은 차를 화면마다 "거주주차"/"지정주차"로 다르게 부르던 것을 "거주주차" 하나로.
  // 앱은 "지정주차"를 저장하지 않는다. 옛 데이터의 "지정주차"도 같은 허용·같은 이름으로 보인다.
  it.each([PARKING_TYPE.RESIDENT, PARKING_TYPE.DESIGNATED])("owner vehicle (%s) is labelled 거주주차", (type) => {
    const owned = vehicle({ user: "resident1", parking_type: type });
    const result = decideVerdict(owned, [], NOW);

    expect(result.label).toBe("거주주차");
    expect(result.allowed).toBe(true);
  });

  it("no vehicle → 무단주차", () => {
    expect(decideVerdict(null, [], NOW).verdict).toBe(VERDICT.UNAUTHORIZED);
  });
});

// P005-013: 권한 확인 화면의 부분 번호 검색.
describe("plateSearchParams", () => {
  it("searches by part of the plate, ignoring spaces", () => {
    expect(plateSearchParams(" 12가 3456 ")).toEqual({ plate_number_contains: "12가3456" });
  });
});
