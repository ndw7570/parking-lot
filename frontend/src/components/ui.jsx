import { createContext, useCallback, useContext, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  IconHome,
  IconCar,
  IconUsers,
  IconBoard,
  IconBack,
  IconAlert,
  IconUser,
} from "./Icons";
import { NotificationBell } from "./NotificationBell";

/* ------------------------------------------------------------ Toast */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const show = useCallback((message, kind = "ok") => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div className={`toast ${toast.kind === "err" ? "err" : ""}`}>
          {toast.message}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

/* ------------------------------------------------------------ App bar */
// 탭 페이지 좌상단 브랜드 로고를 홈 링크로 쓸지. false = 장식(홈은 하단 탭/상세 🏠로만).
// 되돌리려면 true 로 바꾸면 로고 클릭 시 홈으로.
const LOGO_LINKS_HOME = false;

export function AppBar({ title, sub, back, right }) {
  const nav = useNavigate();
  const goHome = () => nav("/");
  const onKeyHome = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goHome();
    }
  };
  return (
    <header className="appbar">
      {back ? (
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="뒤로">
          <IconBack width={20} height={20} />
        </button>
      ) : LOGO_LINKS_HOME ? (
        // 탭 페이지: 브랜드 로고를 누르면 홈으로.
        <div
          className="brand-mark"
          onClick={goHome}
          role="button"
          tabIndex={0}
          onKeyDown={onKeyHome}
          aria-label="홈으로"
          style={{ cursor: "pointer" }}
        >
          <IconCar width={18} height={18} />
        </div>
      ) : (
        // 탭 페이지: 브랜드 로고는 장식(클릭 없음).
        <div className="brand-mark" aria-hidden>
          <IconCar width={18} height={18} />
        </div>
      )}
      <div>
        {sub && <p className="sub">{sub}</p>}
        <h1>{title}</h1>
      </div>
      <div className="spacer" />
      <NotificationBell />
      {/* 상세 페이지(←)에선 우측에 '홈' 아이콘 제공. ←는 이전, 🏠는 홈. */}
      {back && (
        <button className="icon-btn" onClick={goHome} aria-label="홈으로">
          <IconHome width={20} height={20} />
        </button>
      )}
      {right}
    </header>
  );
}

/* ------------------------------------------------------------ Tab bar */
const TABS = [
  { to: "/", label: "홈", Icon: IconHome, end: true },
  { to: "/vehicles", label: "차량", Icon: IconCar },
  { to: "/residents", label: "거주민", Icon: IconUsers },
  { to: "/unauthorized", label: "무단주차", Icon: IconAlert },
  { to: "/board", label: "게시판", Icon: IconBoard },
];

export function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <span className="tab-ico">
            <Icon width={20} height={20} />
          </span>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------ Shell */
export function Shell({ children, bar, hideTabs }) {
  return (
    <div className="app-shell">
      {bar}
      <main className="page">{children}</main>
      {!hideTabs && <TabBar />}
    </div>
  );
}

/* ------------------------------------------------------------ Bits */
export function Badge({ tone = "neutral", children }) {
  return (
    <span className={`badge ${tone}`}>
      <span className="dot" />
      {children}
    </span>
  );
}

export function Loading() {
  return (
    <div className="loading-wrap">
      <div className="spinner" />
    </div>
  );
}

export function Empty({ icon, title, hint }) {
  return (
    <div className="empty">
      <div className="glyph">{icon}</div>
      <div style={{ fontWeight: 600, color: "var(--text-muted)" }}>{title}</div>
      {hint && <div style={{ marginTop: 6, fontSize: 13 }}>{hint}</div>}
    </div>
  );
}

// Top-right account entry used consistently across the main tab pages.
export function AccountButton() {
  const nav = useNavigate();
  return (
    <button
      className="icon-btn"
      aria-label="내 정보"
      onClick={() => nav("/mypage")}
    >
      <IconUser width={20} height={20} />
    </button>
  );
}

