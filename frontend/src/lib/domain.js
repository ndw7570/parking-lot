// ---------------------------------------------------------------------------
// Domain enums — from the matrix (Image 1)
// ---------------------------------------------------------------------------

export const PARKING_TYPE = {
  RESIDENT: "거주주차",
  UNAUTHORIZED: "무단주차",
  VISITOR: "방문주차",
  DESIGNATED: "지정주차",
};

export const VEHICLE_TYPE = {
  SEDAN: "승용차",
  SUV: "SUV",
  VAN: "승합차",
  MOTORCYCLE: "오토바이",
  E_BIKE: "전기자전거",
  BICYCLE: "자전거",
  ETC: "기타",
};

export const COLORS = ["검정색", "하얀색", "회색", "파란색", "빨강색", "기타"];

// 아이디는 항상 소문자 + 공백 제거로 정규화한다. (모든 아이디 입력 공통)
export const normalizeId = (value) => String(value ?? "").replace(/\s/g, "").toLowerCase();

// ---------------------------------------------------------------------------
// 방문차량 유효시간(티켓) — 발급 시점부터 6/12/24시간 유효.
// 실제 알람(출차 30/15/5분 전)은 백엔드가 처리하고, 프론트는 "남은 시간"만 표시한다.
// ---------------------------------------------------------------------------
export const VISIT_DURATIONS = [6, 12, 24]; // hours

// 방문 티켓의 출차 예정 시각(Date) — 백엔드가 명시적 종료시각을 주면 그걸,
// 아니면 발급시각(created_at) + valid_hours 로 계산한다. 계산 불가 시 null.
export function visitExpiry(visitant) {
  if (!visitant) return null;
  const explicit = visitant.parking_end_time || visitant.end_time || visitant.expire_at;
  if (explicit) {
    const d = new Date(explicit);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const raw = visitant.created_at ?? visitant.created ?? visitant.reg_date;
  const hours = Number(visitant.valid_hours);
  if (!raw || !hours) return null;
  const start = new Date(raw);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + hours * 3600 * 1000);
}

// 남은 분(정수). 지났으면 음수, 계산 불가면 null.
export function minutesUntil(date) {
  if (!date) return null;
  return Math.round((date.getTime() - Date.now()) / 60000);
}

// "출차까지 2시간 30분" / "출차까지 20분" / "출차 시간 지남" / "정보 없음"
export function formatRemaining(minutes) {
  if (minutes == null) return "정보 없음";
  if (minutes <= 0) return "출차 시간 지남";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `출차까지 ${h}시간 ${m}분` : `출차까지 ${m}분`;
}

// ---------------------------------------------------------------------------
// Parking permission verdict engine
//
// Matrix logic (Image 1):
//   - 차량테이블에 유저ID가 없다면            → 무단주차
//   - 차량테이블에 유저ID가 있다면            → 지정주차
//   - 유저테이블에 유저ID가 있고, 방문자테이블에 차량ID가 일치 → 방문주차
// ---------------------------------------------------------------------------

export const VERDICT = {
  DESIGNATED: "designated", // 거주민 지정차량 — 허용
  VISITOR: "visitor", // 등록 방문차량 — 조건부 허용
  UNAUTHORIZED: "unauthorized", // 미등록 — 무단주차
};

export const VERDICT_META = {
  [VERDICT.DESIGNATED]: {
    label: "지정주차",
    sub: "거주민 등록 차량",
    tone: "ok",
    allowed: true,
  },
  [VERDICT.VISITOR]: {
    label: "방문주차",
    sub: "등록된 방문 차량",
    tone: "warn",
    allowed: true,
  },
  [VERDICT.UNAUTHORIZED]: {
    label: "무단주차",
    sub: "미등록 차량 · 확인 필요",
    tone: "danger",
    allowed: false,
  },
};

/**
 * 이 차량에 아직 끝나지 않은 방문 티켓이 있는가.
 * 종료 시각을 알 수 없는 티켓은 무효로 본다. 서버 재발급 검사(parking_end_time > now)와
 * 같은 기준이어야 화면은 "방문", 서버는 "새로 발급 가능"으로 갈리지 않는다.
 * @param {number|string} vehicleId
 * @param {Array<object>} visitants
 * @param {Date} [now]
 * @returns {boolean}
 */
export function hasActiveTicket(vehicleId, visitants = [], now = new Date()) {
  return visitants.some((v) => {
    if (v.is_deleted || String(v.vehicle) !== String(vehicleId)) return false;
    const expiry = visitExpiry(v);
    return expiry != null && expiry.getTime() > now.getTime();
  });
}

// 티켓 목록을 못 읽었을 때. 만료로 단정하면 실제 방문객을 무단으로 몬다.
const UNKNOWN_VISIT = {
  verdict: VERDICT.VISITOR,
  ...VERDICT_META[VERDICT.VISITOR],
  sub: "방문 티켓 확인 실패 · 다시 조회해 주세요",
};

const EXPIRED_VISIT = {
  verdict: VERDICT.UNAUTHORIZED,
  ...VERDICT_META[VERDICT.UNAUTHORIZED],
  sub: "방문 시간 만료 · 확인 필요",
};

/**
 * Decide the verdict for a matched vehicle record.
 * @param {object|null} vehicle  the Vehicle row (may be null if plate not found)
 * @param {Array|null} visitants visitant rows for cross-check. null = 불러오지 못함
 * @param {Date} [now]
 */
export function decideVerdict(vehicle, visitants = [], now = new Date()) {
  if (!vehicle) {
    return { verdict: VERDICT.UNAUTHORIZED, ...VERDICT_META[VERDICT.UNAUTHORIZED] };
  }
  if (visitants == null && vehicle.parking_type === PARKING_TYPE.VISITOR) {
    return UNKNOWN_VISIT;
  }
  const tickets = visitants ?? [];

  const hasUser = Boolean(vehicle.user);

  // 방문 판정은 "유효한 티켓"이 있을 때만이다. 티켓이 끝났으면 방문 근거가 없다(B-08).
  if (hasActiveTicket(vehicle.vehicle_id, tickets, now)) {
    return { verdict: VERDICT.VISITOR, ...VERDICT_META[VERDICT.VISITOR] };
  }
  // 방문 차량의 user 는 차주가 아니라 호스트다(VehicleForm). 그래서 user 유무와 무관하게 만료다.
  if (vehicle.parking_type === PARKING_TYPE.VISITOR) {
    return EXPIRED_VISIT;
  }

  // Vehicle has an owner (user_id) → 지정주차
  if (hasUser) {
    return { verdict: VERDICT.DESIGNATED, ...VERDICT_META[VERDICT.DESIGNATED] };
  }

  // No user, no visitor link → 무단주차
  return { verdict: VERDICT.UNAUTHORIZED, ...VERDICT_META[VERDICT.UNAUTHORIZED] };
}

// ---------------------------------------------------------------------------
// 빈집 확인 (empty-home check)
//   A dong-ho is considered "empty" when it has no owning user, or the
//   expected residence period has ended / not started.
// ---------------------------------------------------------------------------
export function homeStatus(dongHo, today = new Date()) {
  const end = dongHo.exp_resi_end_date ? new Date(dongHo.exp_resi_end_date) : null;
  const start = dongHo.exp_resi_start_date
    ? new Date(dongHo.exp_resi_start_date)
    : null;

  if (!dongHo.user) return { key: "empty", label: "빈집", tone: "danger" };
  if (end && end < today) return { key: "ended", label: "거주 종료", tone: "warn" };
  if (start && start > today)
    return { key: "upcoming", label: "입주 예정", tone: "warn" };
  return { key: "occupied", label: "거주 중", tone: "ok" };
}

/**
 * 마이페이지 요약: 내가 연결된 세대와 내 차량.
 * 방문 차량의 user 는 차주가 아니라 호스트라서 보유 차량에서 뺀다.
 * @param {string} userId
 * @param {Array<object>} dongHos
 * @param {Array<object>} vehicles
 * @returns {{ dong_ho_name: string|null, vehicles: Array<object> }}
 */
export function buildMyOverview(userId, dongHos = [], vehicles = []) {
  const mine = (row) => String(row.user ?? "") === String(userId);
  const home = dongHos.find(mine);
  return {
    dong_ho_name: home?.dong_ho_name ?? null,
    vehicles: vehicles.filter((v) => mine(v) && v.parking_type !== PARKING_TYPE.VISITOR),
  };
}

/**
 * 권한 확인 화면의 조회 조건. 번호 일부로 찾는다(서버 plate_number_contains).
 * 정확 일치(plate_number)는 등록 화면의 중복 검사용이라 여기서 쓰지 않는다.
 * @param {string} input
 * @returns {{ plate_number_contains: string }}
 */
export function plateSearchParams(input) {
  return { plate_number_contains: normalizePlateNumber(input) };
}

export function normalizePlateNumber(value = "") {
  return String(value).replace(/\s/g, "").toUpperCase();
}

// The full set of unit names in the building: 13 floors × 4 units = 52.
// e.g. "101호", "102호", … "1304호".
export function buildUnitNames() {
  const units = [];
  for (let floor = 1; floor <= 13; floor += 1) {
    for (let unit = 1; unit <= 4; unit += 1) {
      units.push(`${floor}${String(unit).padStart(2, "0")}호`);
    }
  }
  return units;
}

export function formatPhoneNumber(value = "") {
  const digits = String(value).replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function formatDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(
    dt.getDate()
  ).padStart(2, "0")}`;
}

export function formatDateTime(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return `${formatDate(d)} ${String(dt.getHours()).padStart(2, "0")}:${String(
    dt.getMinutes()
  ).padStart(2, "0")}`;
}
