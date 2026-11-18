// Mock mode is ON when VITE_MOCK is truthy ("1", "true").
// Default: OFF (uses the real backend).
export const MOCK = ["1", "true", "yes"].includes(
  String(import.meta.env.VITE_MOCK || "").toLowerCase()
);

// 로그인 화면의 [데모 구경하기]로 켜는 둘러보기(P005-014). 탭·앱을 닫으면 꺼진다(sessionStorage).
const DEMO_KEY = "pk_demo";

/** 데이터를 가짜(mock)로 처리하는가: 개발용 목 빌드이거나, 둘러보기 중일 때. */
export function isDemo() {
  return MOCK || sessionStorage.getItem(DEMO_KEY) === "1";
}

export function setDemo(on) {
  if (on) sessionStorage.setItem(DEMO_KEY, "1");
  else sessionStorage.removeItem(DEMO_KEY);
}
