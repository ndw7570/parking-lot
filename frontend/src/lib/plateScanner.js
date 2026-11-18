import { Capacitor, registerPlugin } from "@capacitor/core";

// Android 쪽 구현: android/app/src/main/java/com/parkingdesk/app/plate/PlateScannerPlugin.kt
const PlateScanner = registerPlugin("PlateScanner");

/** 카메라 인식은 앱(네이티브) 안에서만 된다. 웹(PWA)에는 플러그인이 없다. */
export function canScanPlate() {
  return Capacitor.isNativePlatform();
}

/**
 * 카메라를 열어 번호판을 읽는다. 사용자가 닫으면 null.
 * 권한 거부 등 다른 실패는 그대로 던진다 - 호출한 화면이 이유를 보여 준다.
 * @returns {Promise<string|null>}
 */
export async function scanPlate() {
  try {
    const { plate } = await PlateScanner.scan();
    return plate ?? null;
  } catch (err) {
    if (err?.code === "CANCELLED") return null;
    throw err;
  }
}
