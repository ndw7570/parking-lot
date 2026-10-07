// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for all demo data.
//
// Every mock table (user_profile, dong_ho, vehicle, visitant,
// unauthorized_parking_record, post, comment) is DERIVED from the definition
// arrays in this one file, so foreign keys always line up across every page.
// To change the demo dataset, edit THIS file only — never hand-type an id into
// a table, and never keep a second copy of data inside a page component.
//
// Conventions:
//   - A resident's user_id IS their unit name (e.g. "101호"), matching what the
//     resident-register form produces, so ids never drift from units.
//   - user_profile.dong_ho_id <-> dong_ho.dong_ho_id and dong_ho.user <->
//     user_profile.user_id are kept consistent on BOTH sides.
//   - Plate numbers are stored normalized (no spaces), matching the plate rules.
// ---------------------------------------------------------------------------

function isoDaysAgo(days, hours = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

// Residents currently living in a unit.
export const RESIDENTS = [
  { unitId: 1, unit: "101호", name: "김철수", phone: "010-1234-5678", term: "long", start: "2024-03-01", end: "2027-02-28" },
  { unitId: 2, unit: "203호", name: "이영희", phone: "010-2222-3333", term: "long", start: "2025-01-01", end: "2027-12-31" },
  { unitId: 3, unit: "501호", name: "박민준", phone: "010-4444-5555", term: "long", start: "2025-05-01", end: "2027-04-30" },
  { unitId: 4, unit: "801호", name: "정수아", phone: "010-7777-8888", term: "temp", start: "2026-06-01", end: "2026-09-30" },
];

// Known units with no resident yet (빈집).
export const EMPTY_UNITS = [{ unitId: 5, unit: "1301호" }];

// Registered people not yet linked to any unit ("나중에 지정" demo).
export const UNLINKED_USERS = [
  { user_id: "u-1001", user_name: "한지민", phone: "010-5555-6666" },
];

// Vehicles. Resident cars (거주주차) + one invited visitor car (방문주차).
// `user` references a resident's unit-name id above.
export const VEHICLES = [
  { vehicle_id: 1, user: "101호", parking_type: "거주주차", vehicle_type: "승용차", model_name: "그랜저 IG", plate_number: "12가3456", color: "검정색", tower_yn: true, remarks: null },
  { vehicle_id: 2, user: "501호", parking_type: "거주주차", vehicle_type: "SUV", model_name: "팰리세이드", plate_number: "21머4503", color: "회색", tower_yn: false, remarks: null },
  { vehicle_id: 3, user: "101호", parking_type: "거주주차", vehicle_type: "오토바이", model_name: "PCX", plate_number: "서울1234", color: "빨강색", tower_yn: false, remarks: null },
  { vehicle_id: 4, user: "203호", parking_type: "방문주차", vehicle_type: "승용차", model_name: "소나타", plate_number: "34나5789", color: "하얀색", tower_yn: true, remarks: "이영희 세대 방문차량" },
];

// Invited visitors: link a guest + their (방문주차) vehicle to the host resident.
export const VISITANTS = [
  { visitant_id: 1, user: "203호", vehicle: 4, visitant_name: "최방문", phone_number: "010-9999-0000", createdHoursAgo: 3, valid_hours: 24 },
];

// Unauthorized-parking incidents. Standalone records whose plates are NOT in
// the vehicle table (so Verify reports them 무단). `vehicle_id` is this table's
// own surrogate key — it does not reference the vehicle table.
export const UNAUTHORIZED = [
  { vehicle_id: 1, plate_number: "88로2020", phone_number: null, start: [0, 2], end: null, parking_location: "지상 방문자석", remarks: "번호판 확인 요망" },
  { vehicle_id: 2, plate_number: "99하8712", phone_number: "010-1111-2222", start: [1, 0], end: [0, 1], parking_location: "지하 2층", remarks: null },
];

// Community board. `user` references real residents.
export const POSTS = [
  { posts_id: 1, posts_type: "NOTICE", sort_order: 1, user: "101호", title: "주차장 라인 재도색 안내 (4/15~4/16)", content: "안녕하세요, 관리사무소입니다.\n\n지하 1층 주차장 라인 재도색 공사가 진행됩니다. 해당 기간 지상 방문자석을 이용해 주세요.", is_pinned: true, view_count: 152, comment_count: 2, like_count: 8, created: [3] },
  { posts_id: 2, posts_type: "FREE", sort_order: null, user: "203호", title: "방문차량 등록 이렇게 하면 되나요?", content: "홈 화면 방문차량 등록으로 하면 24시간 유효하다고 하네요.", is_pinned: false, view_count: 41, comment_count: 1, like_count: 3, created: [1] },
  { posts_id: 3, posts_type: "QNA", sort_order: null, user: "501호", title: "무단주차 신고는 어디로 하나요?", content: "옆자리에 계속 모르는 차가 서 있어요.", is_pinned: false, view_count: 27, comment_count: 0, like_count: 1, created: [0, 5] },
];

export const COMMENTS = [
  { comments_id: 1, post: 1, reply_count: 0, depth: 0, user: "203호", parent: null, content: "안내 감사합니다!", like_count: 1, created: [2] },
  { comments_id: 2, post: 1, reply_count: 0, depth: 1, user: "101호", parent: 1, content: "네, 불편을 드려 죄송합니다.", like_count: 0, created: [2] },
  { comments_id: 3, post: 2, reply_count: 0, depth: 0, user: "501호", parent: null, content: "맞아요, 24시간 지나면 다시 등록해야 해요.", like_count: 0, created: [1] },
];

// Derive the full relational dataset from the definitions above.
export function buildSeed() {
  const user_profile = [
    ...RESIDENTS.map((r) => ({
      user_id: r.unit, dong_ho_id: r.unitId, user_name: r.name, phone_number: r.phone, is_deleted: false,
    })),
    ...UNLINKED_USERS.map((u) => ({
      user_id: u.user_id, dong_ho_id: null, user_name: u.user_name, phone_number: u.phone, is_deleted: false,
    })),
  ];

  const dong_ho = [
    ...RESIDENTS.map((r) => ({
      dong_ho_id: r.unitId,
      dong_ho_name: r.unit,
      user: r.unit,
      exp_resi_start_date: r.term === "long" ? r.start : null,
      exp_resi_end_date: r.term === "long" ? r.end : null,
      temp_resi_start_date: r.term === "temp" ? r.start : null,
      temp_resi_end_date: r.term === "temp" ? r.end : null,
      admin_check: true,
      remarks: null,
      is_deleted: false,
    })),
    ...EMPTY_UNITS.map((e) => ({
      dong_ho_id: e.unitId,
      dong_ho_name: e.unit,
      user: null,
      exp_resi_start_date: null,
      exp_resi_end_date: null,
      temp_resi_start_date: null,
      temp_resi_end_date: null,
      admin_check: false,
      remarks: "공실",
      is_deleted: false,
    })),
  ];

  const vehicle = VEHICLES.map((v) => ({ ...v, attachment_file_id: null, is_deleted: false }));

  const visitant = VISITANTS.map(({ createdHoursAgo, ...v }) => ({
    ...v,
    remarks: null,
    created_at: isoDaysAgo(0, createdHoursAgo ?? 0),
    is_deleted: false,
  }));

  const unauthorized_parking_record = UNAUTHORIZED.map((u) => ({
    vehicle_id: u.vehicle_id,
    plate_number: u.plate_number,
    phone_number: u.phone_number,
    parking_start_time: isoDaysAgo(...u.start),
    parking_end_time: u.end ? isoDaysAgo(...u.end) : null,
    parking_location: u.parking_location,
    attachment_file_id: null,
    remarks: u.remarks,
    is_deleted: false,
  }));

  const post = POSTS.map(({ created, ...p }) => ({
    ...p,
    attachment_file_id: null,
    created_at: isoDaysAgo(...created),
    updated_at: null,
    deleted_at: null,
    remarks: null,
    is_deleted: false,
  }));

  const comment = COMMENTS.map(({ created, ...c }) => ({
    ...c,
    created_at: isoDaysAgo(...created),
    updated_at: null,
    deleted_at: null,
    remarks: null,
    is_deleted: false,
  }));

  return {
    user_profile,
    dong_ho,
    vehicle,
    visitant,
    unauthorized_parking_record,
    post,
    comment,
    post_like: [],
    comment_like: [],
    attachment_file: [],
  };
}
