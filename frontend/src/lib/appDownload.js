import { Capacitor } from "@capacitor/core";
import client from "../api/client";
import { isDemo } from "../api/config";

/**
 * 웹에서만 [Android 앱 받기]를 보여 준다. 앱 안에서는 이미 앱이고, 데모(둘러보기)에는 서버가 없다.
 * @returns {boolean}
 */
export function canDownloadAndroidApp() {
  return !isDemo() && !Capacitor.isNativePlatform();
}

/**
 * 로그인한 상태로 5분짜리 서명 다운로드 링크를 받는다.
 * 일반 링크는 로그인 토큰을 실을 수 없어서, 토큰이 있는 요청으로 링크를 먼저 발급받는다.
 * 서버: backend/core/views/app_download.py
 * @returns {Promise<string>}
 */
export async function androidAppDownloadUrl() {
  const { data } = await client.post("/api/app/android/link/");
  return data.url;
}
