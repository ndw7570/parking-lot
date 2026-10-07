import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import { MOCK } from "../api/config";
import { Field, TextInput } from "../components/form";
import { useToast } from "../components/ui";
import { IconCar } from "../components/Icons";
import { normalizeId } from "../lib/domain";

export default function Login() {
  const nav = useNavigate();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!username.trim()) {
      toast("아이디를 입력해 주세요.", "err");
      return;
    }
    setBusy(true);
    try {
      await authApi.login(username.trim(), password);
      nav("/", { replace: true });
    } catch (err) {
      const status = err.response?.status;
      toast(
        status === 401
          ? "아이디 또는 비밀번호가 올바르지 않습니다."
          : "로그인에 실패했습니다. 네트워크를 확인해 주세요.",
        "err"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="hero">
        <div className="mark">
          <IconCar width={34} height={34} />
        </div>
        <h2>아파트 방문차량 관리</h2>
        <p>거주민·방문 차량 등록과 주차 권한을 한 곳에서</p>
        {MOCK && (
          <span
            className="badge warn"
            style={{ marginTop: 10, display: "inline-flex" }}
          >
            데모 모드 · 아무 값으로 로그인
          </span>
        )}
      </div>

      <form onSubmit={submit} noValidate>
        <Field label="아이디">
          <TextInput
            placeholder="아이디"
            value={username}
            onChange={(e) => setUsername(normalizeId(e.target.value))}
            autoComplete="username"
          />
        </Field>

        <Field label="비밀번호">
          <TextInput
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>

        <button className="btn primary" disabled={busy} style={{ marginTop: 8 }}>
          {busy ? "확인 중…" : "로그인"}
        </button>

        {MOCK && (
          <button
            type="button"
            className="btn signal"
            style={{ marginTop: 10 }}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await authApi.login("관리자", "demo");
                nav("/", { replace: true });
              } finally {
                setBusy(false);
              }
            }}
          >
            데모로 바로 입장 (백엔드 없이)
          </button>
        )}

        <div className="btn-row" style={{ marginTop: 12 }}>
          <button type="button" className="btn ghost" onClick={() => nav("/register")}>
            회원가입
          </button>
          <button type="button" className="btn ghost" onClick={() => nav("/password")}>
            비밀번호 변경
          </button>
        </div>
      </form>

      <div className="divider">관리자 로그인</div>
      <p
        className="muted"
        style={{ textAlign: "center", fontSize: 12.5, lineHeight: 1.5 }}
      >
        관리실 계정은 부여받은 관리자 아이디로 로그인하세요.
      </p>
    </div>
  );
}
