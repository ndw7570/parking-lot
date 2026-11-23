import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shell, AppBar, useToast } from "../components/ui";
import { Field, TextInput, TextArea, ChipPicker } from "../components/form";
import { IconCamera } from "../components/Icons";
import { reportApi } from "../api/resources";
import { normalizePlateNumber } from "../lib/domain";
import { shrinkPhoto } from "../lib/photo";

const LOCATIONS = ["지상", "주차타워", "기타"];
// 신고 화면 안내 한 줄(P005-025 결정). 보관 기한은 서버 REPORT_PHOTO_KEEP_DAYS 와 같아야 한다.
export const PHOTO_NOTICE = "사진은 관리자와 신고한 분만 봅니다. 처리 후 30일이 지나면 지워집니다.";

// 무단주차 사진 신고 (P005-025). 판정 화면에서 번호를 채워 들어온다. 거주민도 쓴다.
export default function ReportForm() {
  const nav = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const fileRef = useRef(null);
  const [plate, setPlate] = useState(normalizePlateNumber(params.get("plate") || ""));
  const [location, setLocation] = useState("지상");
  const [remarks, setRemarks] = useState("");
  const [photo, setPhoto] = useState(null); // 줄인 JPEG Blob
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 사진을 다시 골라도 change 가 오게
    if (!file) return;
    setError(null);
    try {
      const blob = await shrinkPhoto(file);
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
    } catch (err) {
      setError(err.message || "사진을 읽지 못했습니다.");
    }
  }

  async function submit(e) {
    e.preventDefault();
    const plateNo = normalizePlateNumber(plate);
    if (!plateNo) {
      setError("차량번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await reportApi.create({ plate_number: plateNo, parking_location: location, remarks, photo });
      toast(res.merged ? "이미 접수된 차량이라 신고를 합쳤습니다." : "관리자에게 신고했습니다.");
      nav(`/reports/${res.id}`, { replace: true });
    } catch (err) {
      const d = err.response?.data;
      setError(d?.detail || d?.photo?.[0] || d?.plate_number?.[0] || "신고하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell bar={<AppBar back sub="Report" title="무단주차 신고" />} hideTabs>
      <form onSubmit={submit} className="stack">
        <div className="report-photo">
          {preview ? (
            <img src={preview} alt="신고할 차량 사진" />
          ) : (
            <div className="report-photo-empty">
              <IconCamera width={28} height={28} />
              <span>번호판이 보이게 찍어 주세요</span>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPick}
          hidden
        />
        <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
          <IconCamera width={18} height={18} /> {preview ? "다시 찍기" : "사진 찍기"}
        </button>
        <p className="report-notice">{PHOTO_NOTICE}</p>

        <Field label="차량번호">
          <TextInput value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="12가3456" />
        </Field>
        <Field label="위치">
          <ChipPicker options={LOCATIONS} value={location} onChange={setLocation} />
        </Field>
        <Field label="메모 (선택)">
          <TextArea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} placeholder="예: 소방차 전용 구역" />
        </Field>

        {error && <div className="form-error" role="alert">{error}</div>}

        <button type="submit" className="btn danger" disabled={busy}>
          {busy ? "보내는 중..." : "관리자에게 신고"}
        </button>
      </form>
    </Shell>
  );
}
