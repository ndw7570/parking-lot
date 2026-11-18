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
