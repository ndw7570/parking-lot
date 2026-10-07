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
 * Decide the verdict for a matched vehicle record.
 * @param {object|null} vehicle  the Vehicle row (may be null if plate not found)
 * @param {Array} visitants      visitant rows for cross-check
 */
export function decideVerdict(vehicle, visitants = []) {
  if (!vehicle) {
    return { verdict: VERDICT.UNAUTHORIZED, ...VERDICT_META[VERDICT.UNAUTHORIZED] };
  }

  const hasUser = Boolean(vehicle.user);

  // Vehicle is referenced by a visitant record → 방문주차
  const isVisitorLinked = visitants.some(
    (v) => String(v.vehicle) === String(vehicle.vehicle_id)
  );
  if (isVisitorLinked || vehicle.parking_type === PARKING_TYPE.VISITOR) {
    return { verdict: VERDICT.VISITOR, ...VERDICT_META[VERDICT.VISITOR] };
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
