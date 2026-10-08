import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// The backend base is configured through VITE_API_BASE (see .env / docker-compose).
// In dev we also proxy /api and /users to the Django server so there are no CORS issues.
const BACKEND = process.env.BACKEND_ORIGIN || "http://localhost:8000";

// Hosts allowed to reach the dev server (Vite blocks unknown Host headers).
// Extendable via ALLOWED_HOSTS="a.com,b.com"; the DDNS host is allowed by default.
//
// DDNS 이름이 바뀔 때마다 여기서 막혀 왔다. 그래서 개별 호스트만이 아니라 쓰는
// DDNS 제공자의 와일드카드를 함께 둔다. 앞의 점이 서브도메인 전체를 뜻한다.
const ALLOWED_HOSTS = [
  "parking-lot.duckdns.org",
  ".duckdns.org",
  "namddww.iptime.org",
  ".iptime.org",
  ...(process.env.ALLOWED_HOSTS || "").split(",").map((h) => h.trim()).filter(Boolean),
];

// 홈 화면에 설치해 앱처럼 쓰기 위한 설정. 캐시 대상은 빌드 산출물로 한정한다.
const pwa = VitePWA({
  // 새 버전이 올라오면 조용히 교체한다. 지하주차장처럼 접속이 띄엄띄엄한 환경에서
  // 사용자에게 갱신 여부를 묻는 UI 는 그냥 구버전에 머무는 결과가 되기 쉽다.
  registerType: "autoUpdate",
  // 등록은 main.jsx 에서 직접 한다. 자동 주입에 맡기면 가상 모듈 import 감지에
  // 따라 등록이 되기도 안 되기도 해서, 설치가 조용히 실패해도 알 길이 없다.
  injectRegister: null,
  includeAssets: ["apple-touch-icon.png", "favicon-32.png"],
  manifest: {
    name: "주차관리 · Parking Desk",
    short_name: "주차관리",
    description: "입주민 차량·방문차량·무단주차를 관리하는 주차 관리 앱",
    lang: "ko",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // 설치 스플래시 배경. app.css 의 --paper 와 맞춘다.
    background_color: "#f5f7fb",
    // index.html 의 theme-color 와 같아야 안드로이드 상태바가 따로 놀지 않는다.
    theme_color: "#0b3d91",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // maskable 이 없으면 안드로이드가 아이콘을 흰 원 안에 축소해 넣는다.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
    // 해시가 바뀐 옛 산출물이 캐시에 쌓이지 않게 한다.
    cleanupOutdatedCaches: true,
    navigateFallback: "/index.html",
    // nginx 가 백엔드로 넘기는 경로까지 SPA 셸로 가로채면 안 된다.
    navigateFallbackDenylist: [
      /^\/api\//,
      /^\/users\//,
      /^\/admin/,
      /^\/docs\//,
      /^\/schema\//,
      /^\/redoc\//,
      /^\/static\//,
    ],
    runtimeCaching: [
      {
        // 본문 폰트는 외부에서 받아온다. 캐시가 없으면 오프라인에서 글꼴이 바뀐다.
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
  // 개발 중에는 서비스워커를 띄우지 않는다. 캐시가 끼면 수정이 반영 안 된 것처럼 보인다.
  devOptions: { enabled: false },
});

export default defineConfig({
  plugins: [react(), pwa],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ALLOWED_HOSTS,
    proxy: {
      "/api": { target: BACKEND, changeOrigin: true },
      "/users": { target: BACKEND, changeOrigin: true },
    },
  },
});
