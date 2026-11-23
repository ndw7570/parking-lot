/**
 * DRF 오류 응답에서 사용자에게 보여 줄 문장 하나를 고른다.
 * serializer.validate() 의 거절은 non_field_errors 에, 필드 검증은 필드 이름 아래에 온다.
 * @param {unknown} data  err.response?.data
 * @returns {string|null}
 */
export function backendErrorMessage(data) {
  if (!data || typeof data !== "object") return null;
  if (typeof data.message === "string" && data.message) return data.message;
  if (typeof data.detail === "string" && data.detail) return data.detail;
  const lists = [data.non_field_errors, ...Object.values(data)];
  const first = lists.find((v) => Array.isArray(v) && typeof v[0] === "string");
  return first ? first[0] : null;
}

// ------------------------------------------------------------ 상황에 맞는 오류 문장
// 화면은 catch 에서 errorMessage(err, "무엇을 못 했는지") 하나만 부른다.
// 원칙(ECC error-handling): 사용자 문장에는 내부 사정(HTML·스택·컬럼 이름)을 넣지 않는다.
// 문장은 아래 표 한 곳에서 관리한다. 서버 코드표는 backend/core/errors.py.

/** 코드 -> 사용자 문장. 업무 규칙 코드(ALREADY_OPEN 등)는 서버 문장을 그대로 쓴다. */
export const ERROR_MESSAGES = {
  NETWORK: "서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.",
  TIMEOUT: "서버 응답이 늦습니다. 잠시 후 다시 시도해 주세요.",
  NOT_AUTHENTICATED: "로그인이 만료되었습니다. 다시 로그인해 주세요.",
  PERMISSION_DENIED: "이 작업을 할 권한이 없습니다. 관리자에게 문의해 주세요.",
  NOT_FOUND: "찾는 정보가 없습니다. 이미 지워졌을 수 있습니다.",
  TOO_LARGE: "보내는 내용이 너무 큽니다.",
  RATE_LIMITED: "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.",
  SERVER_ERROR: "서버에 문제가 생겨 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

// 서버 필드 이름 -> 화면 이름
const FIELD_LABELS = {
  plate_number: "차량번호",
  parking_location: "주차 위치",
  phone_number: "연락처",
  valid_hours: "유효시간",
  vehicle_type: "차종",
  user: "거주민",
  username: "아이디",
  password: "비밀번호",
  title: "제목",
  content: "내용",
  dong_ho_name: "호수",
};

// Django 기본 문장 -> 사람 말
const REWRITES = [
  [/이미 존재합니다/, () => "이미 등록되어 있습니다."],
  [/글자 수가 (\d+) 이하/, (m) => `${m[1]}자 이하로 입력해 주세요.`],
  [/null일 수 없습니다|필수 항목|비워 둘 수 없습니다/, () => "꼭 입력해야 합니다."],
  [/유효한 (날짜|시각|숫자|정수)/, (m) => `올바른 ${m[1]}를 입력해 주세요.`],
];

const BY_STATUS = { 401: "NOT_AUTHENTICATED", 403: "PERMISSION_DENIED", 404: "NOT_FOUND", 413: "TOO_LARGE", 429: "RATE_LIMITED" };

/** @returns {string} 오류 코드. 서버 코드가 있으면 그것, 없으면 상태·연결로 판단. */
export function errorCode(err) {
  const server = err?.response?.data?.error?.code;
  if (server) return server;
  const status = err?.response?.status;
  if (status) return BY_STATUS[status] || (status >= 500 ? "SERVER_ERROR" : "VALIDATION_ERROR");
  if (err?.code === "ECONNABORTED" || err?.code === "ETIMEDOUT") return "TIMEOUT";
  if (err?.request || err?.message === "Network Error") return "NETWORK";
  return "UNKNOWN";
}

function fieldMessage(data) {
  if (!data || typeof data !== "object") return null;
  for (const [field, value] of Object.entries(data)) {
    if (field === "error" || field === "detail" || !Array.isArray(value) || typeof value[0] !== "string") continue;
    const raw = value[0];
    const rule = REWRITES.find(([re]) => re.test(raw));
    const text = rule ? rule[1](raw.match(rule[0])) : raw;
    const label = FIELD_LABELS[field];
    return label && field !== "non_field_errors" ? `${label}: ${text}` : text;
  }
  return null;
}

/**
 * 사용자에게 보여 줄 오류 문장 하나.
 * @param {unknown} err  axios 오류
 * @param {string} fallback  이 화면에서 못 한 일("저장하지 못했습니다.")
 */
export function errorMessage(err, fallback) {
  if (!err) return fallback;
  const code = errorCode(err);
  const status = err.response?.status;
  if (code === "SERVER_ERROR") return `${ERROR_MESSAGES.SERVER_ERROR} (오류 ${status || 500})`;
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  const data = err.response?.data;
  if (data && typeof data === "object") {
    // 업무 규칙 거절(409·400): 서버가 사람에게 쓴 문장
    if (code !== "VALIDATION_ERROR" && data.error?.message) return data.error.message;
    const field = fieldMessage(data);
    if (field) return field;
    if (typeof data.detail === "string" && data.detail) return data.detail;
  }
  return fallback;
}

/** catch 에서 원인을 개발자 도구에 남긴다(조용히 삼키지 않기). 사용자 문장과 따로. */
export function logError(where, err) {
  // eslint-disable-next-line no-console
  console.error(`[${where}]`, errorCode(err), err?.response?.status ?? "", err?.response?.data ?? err?.message ?? err);
}
