// P005-016: Android 하드웨어 뒤로가기 규칙. 화면 연결은 App.jsx 의 NativeBackHandler.
//   상세 화면      -> 이전 화면 (기록이 없으면 홈)
//   다른 탭 첫 화면 -> 홈 (탭을 거꾸로 하나씩 되짚지 않게)
//   홈·로그인       -> 첫 번째는 안내, 시간 안에 한 번 더 누르면 앱을 백그라운드로

/** 홈에서 "한 번 더" 를 인정하는 시간(ms). 안드로이드 앱들이 흔히 쓰는 2초. */
export const EXIT_WINDOW_MS = 2000;

const TAB_ROOTS = new Set(["/vehicles", "/residents", "/unauthorized", "/board"]);
const EXIT_ROOTS = new Set(["/", "/login"]);

/**
 * @param {{ path: string, canGoBack: boolean, lastBackAt: number, now: number }} state
 * @returns {"history" | "home" | "confirm" | "exit"}
 */
export function decideBack({ path, canGoBack, lastBackAt, now }) {
  if (EXIT_ROOTS.has(path)) return now - lastBackAt < EXIT_WINDOW_MS ? "exit" : "confirm";
  if (TAB_ROOTS.has(path)) return "home";
  return canGoBack ? "history" : "home";
}
