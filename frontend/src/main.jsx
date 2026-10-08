import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { seedDemoSession } from "./api/auth";
import "./styles/app.css";

// 서비스워커 등록. 홈 화면에 설치해 앱처럼 쓰기 위한 전제이고, 오프라인에서도
// 셸이 뜨게 해 준다. registerType: "autoUpdate" 라 새 버전은 알아서 교체된다.
// 개발 모드에서는 vite.config.js 의 devOptions 가 꺼져 있어 아무 일도 하지 않는다.
registerSW({ immediate: true });

// In mock mode (npm run dev:mock / docker compose dev), enter as a demo user
// right away — no login screen.
seedDemoSession();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
