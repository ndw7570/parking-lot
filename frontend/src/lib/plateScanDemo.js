// P005-019: 웹 데모의 번호판 인식 "체험". 브라우저에는 인식 엔진이 없어 실제로 읽지 않고,
// 앱 인식 화면(ScanActivity)과 같은 순서로 문구만 보여 준다. 화면: components/PlateScanDemo.jsx

/** 데모 데이터(api/mockData.js)에 있는 번호. 체험 뒤 조회에서 결과가 나오도록. */
export const DEMO_PLATE = "12가3456";

/**
 * 체험 화면이 단계마다 보여 줄 상태. 앱과 같은 확정 규칙(같은 번호 N번)을 흉내 낸다.
 * @param {string} plate
 * @param {number} required
 * @returns {{ status: string, detected: boolean }[]}
 */
export function demoScanTimeline(plate, required = 3) {
  const counting = Array.from({ length: required }, (_, i) => ({
    status: `${plate}  확인 중 ${i + 1}/${required}`,
    detected: true,
  }));
  return [{ status: "", detected: false }, { status: "번호판을 찾는 중…", detected: false }, ...counting];
}
