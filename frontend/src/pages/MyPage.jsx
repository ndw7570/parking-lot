import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, AppBar, useToast, Loading } from "../components/ui";
import { Field, TextInput } from "../components/form";
import { dongHoApi, userProfileApi, vehicleApi } from "../api/resources";
import { authApi, getCurrentUserId } from "../api/auth";
import { buildMyOverview, formatPhoneNumber } from "../lib/domain";
import { androidAppDownloadUrl, canDownloadAndroidApp } from "../lib/appDownload";
import { errorMessage, logError } from "../lib/apiError";

// 서버에 "내 요약" 전용 API 가 없어 세대·차량 목록에서 내 것을 고른다(P005-010).
// 전용 API 가 생기면 이 함수 본문만 바꾸면 된다.
async function fetchMyOverview(username) {
  const [dongHos, vehicles] = await Promise.all([dongHoApi.list(), vehicleApi.list()]);
  return buildMyOverview(username, dongHos, vehicles);
}

export default function MyPage() {
  const nav = useNavigate();
  const toast = useToast();

  // 5분짜리 서명 링크를 받아 그 주소로 이동하면 브라우저가 APK 를 내려받는다.
  async function downloadAndroidApp() {
    try {
      window.location.assign(await androidAppDownloadUrl());
    } catch {
      toast("앱 다운로드 링크를 받지 못했습니다. 다시 로그인한 뒤 시도해 주세요.", "err");
    }
  }
  const username = getCurrentUserId();
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ user_name: "", phone_number: "" });
  const [saved, setSaved] = useState({ user_name: "", phone_number: "" });
  const [overview, setOverview] = useState(null); // 거주 호수 + 보유 차량 (읽기 전용)

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await userProfileApi.get(username);
        if (alive && p) {
          setHasProfile(true);
          const v = { user_name: p.user_name || "", phone_number: p.phone_number || "" };
          setForm(v);
          setSaved(v);
        }
      } catch {
        // 404 → no profile yet (e.g. account created before this feature)
      }
      const ov = await fetchMyOverview(username).catch(() => null);
      if (alive) {
        setOverview(ov);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [username]);

  const onInput = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const onPhone = (e) => setForm((f) => ({ ...f, phone_number: formatPhoneNumber(e.target.value) }));

  const cancelEdit = () => {
    setForm(saved);
    setEditing(false);
  };

  async function save(e) {
    e.preventDefault();
    if (!form.user_name.trim()) return toast("이름을 입력해 주세요.", "err");
    if (!form.phone_number.trim()) return toast("연락처를 입력해 주세요.", "err");
    setBusy(true);
    try {
      const payload = { user_name: form.user_name.trim(), phone_number: form.phone_number };
      if (hasProfile) {
        await userProfileApi.patch(username, payload);
      } else {
        await userProfileApi.create({ user_id: username, ...payload });
        setHasProfile(true);
      }
      setSaved(payload);
      setForm(payload);
      setEditing(false);
      toast("저장되었습니다.");
    } catch (err) {
      logError("mypage-save", err);
      toast(errorMessage(err, "내 정보를 저장하지 못했습니다."), "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell bar={<AppBar title="마이페이지" sub="My" back />} hideTabs>
      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="row between" style={{ marginBottom: 8 }}>
            <div className="section-title" style={{ margin: 0 }}>회원 정보</div>
            {!editing && (
              <button
                type="button"
                className="btn ghost"
                style={{ width: "auto", padding: "6px 12px" }}
                onClick={() => setEditing(true)}
              >
                수정
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={save}>
              <Field label="아이디" hint="아이디는 변경할 수 없습니다.">
                <TextInput value={username} disabled />
              </Field>
              <Field label="이름">
                <TextInput
                  placeholder="이름"
                  value={form.user_name}
                  onChange={onInput("user_name")}
                  autoFocus
                />
              </Field>
              <Field label="연락처">
                <TextInput
                  placeholder="010-0000-0000"
                  inputMode="tel"
                  maxLength={13}
                  value={form.phone_number}
                  onChange={onPhone}
                />
              </Field>
              <div className="btn-row" style={{ marginTop: 8 }}>
                <button type="button" className="btn ghost" disabled={busy} onClick={cancelEdit}>
                  취소
                </button>
                <button className="btn primary" disabled={busy}>
                  {busy ? "저장 중…" : "저장"}
                </button>
              </div>
            </form>
          ) : (
            <div className="card">
              <div className="detail-line">
                <span className="k">아이디</span>
                <span className="v">{username || "-"}</span>
              </div>
              <div className="detail-line">
                <span className="k">이름</span>
                <span className="v">{saved.user_name || "-"}</span>
              </div>
              <div className="detail-line">
                <span className="k">연락처</span>
                <span className="v">{saved.phone_number || "-"}</span>
              </div>
            </div>
          )}

          <div className="section-title" style={{ marginTop: 18 }}>현재 거주 호수</div>
          <div className="card" style={{ padding: 14, fontWeight: 700 }}>
            {overview?.dong_ho_name || "미배정"}
          </div>

          <div className="section-title">현재 보유 차량</div>
          {overview?.vehicles?.length ? (
            <div className="stack">
              {overview.vehicles.map((v, i) => (
                <div className="card" key={i} style={{ padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>{v.plate_number || `#${i + 1}`}</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                    {[v.vehicle_type, v.model_name, v.parking_type].filter(Boolean).join(" · ") || "정보 없음"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted" style={{ padding: "4px 2px" }}>보유 차량이 없습니다.</div>
          )}

          {canDownloadAndroidApp() && (
            <>
              <div className="section-title" style={{ marginTop: 18 }}>앱</div>
              <button type="button" className="btn ghost" onClick={downloadAndroidApp}>
                Android 앱 받기
              </button>
              <div className="muted" style={{ fontSize: 12, margin: "6px 2px 0" }}>
                카메라로 번호판을 바로 읽을 수 있습니다. 설치할 때 "출처를 알 수 없는 앱" 허용이 필요합니다.
              </div>
            </>
          )}

          <div className="section-title" style={{ marginTop: 18 }}>계정</div>
          <button type="button" className="btn ghost" onClick={() => nav("/password")}>
            비밀번호 변경
          </button>
          <button
            type="button"
            className="btn danger"
            style={{ marginTop: 10 }}
            onClick={() => {
              authApi.logout();
              nav("/login", { replace: true });
            }}
          >
            로그아웃
          </button>
        </>
      )}
    </Shell>
  );
}
