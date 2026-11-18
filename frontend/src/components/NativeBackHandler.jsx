import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { decideBack } from "../lib/backButton";
import { useToast } from "./ui";

/**
 * Android 하드웨어 뒤로가기 (P005-016). 앱 안에서만 동작한다. 규칙은 lib/backButton.js.
 * 이 리스너가 없으면 어느 화면에서든 뒤로가기 한 번에 앱이 백그라운드로 넘어간다.
 */
export function NativeBackHandler() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const toast = useToast();
  const pathRef = useRef(pathname);
  const lastBackAt = useRef(0);

  // 리스너는 한 번만 붙이고, 현재 경로는 ref 로 읽는다(경로가 바뀔 때마다 다시 붙이지 않게).
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    const handle = CapacitorApp.addListener("backButton", () => {
      const action = decideBack({
        path: pathRef.current,
        // react-router 가 history.state.idx 에 이 앱 안에서의 위치를 적는다. 0 이면 되돌아갈 곳이 없다.
        canGoBack: (window.history.state?.idx ?? 0) > 0,
        lastBackAt: lastBackAt.current,
        now: Date.now(),
      });
      if (action === "history") nav(-1);
      else if (action === "home") nav("/", { replace: true });
      else if (action === "confirm") {
        lastBackAt.current = Date.now();
        toast("한 번 더 누르면 앱이 닫힙니다");
      } else CapacitorApp.minimizeApp(); // 종료가 아니라 백그라운드로. 다시 열면 그 자리
    });
    return () => {
      handle.then((h) => h.remove());
    };
  }, [nav, toast]);

  return null;
}
