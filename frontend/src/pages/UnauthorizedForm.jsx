import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shell, AppBar, useToast } from "../components/ui";
import { Field, TextInput, TextArea, ChipPicker } from "../components/form";
import { unauthorizedApi, vehicleApi, userProfileApi } from "../api/resources";
import { formatPhoneNumber, normalizePlateNumber, PARKING_TYPE } from "../lib/domain";

const LOCATIONS = ["지상", "주차타워", "기타"];

export default function UnauthorizedForm() {
  const nav = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [owners, setOwners] = useState([]);
  const [matched, setMatched] = useState(null); // existing vehicle for the typed plate
  const [plateApplied, setPlateApplied] = useState(false); // 차량번호 '적용'을 눌렀는가

  const [form, setForm] = useState({
    plate_number: normalizePlateNumber(params.get("plate") || ""),
    phone_number: "",
    parking_location: "",
    remarks: "",
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [vList, oList] = await Promise.all([
          vehicleApi.list(),
          userProfileApi.list().catch(() => []),
        ]);
        if (alive) {
          setVehicles(vList || []);
          setOwners(oList || []);
        }
      } catch {
        if (alive) {
          setVehicles([]);
          setOwners([]);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const onInput = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const onPhoneInput = (e) => setForm((f) => ({ ...f, phone_number: formatPhoneNumber(e.target.value) }));
  // Typing a new plate invalidates the previous match.
  const onPlateInput = (e) => {
    setForm((f) => ({ ...f, plate_number: normalizePlateNumber(e.target.value) }));
    setMatched(null);
    setPlateApplied(false); // 번호가 바뀌면 다시 '적용'해야 함
  };

  const ownerNameOf = (userId) => {
    const o = owners.find((x) => String(x.user_id) === String(userId));
    return o?.user_name || userId || null;
  };

  const findMatch = (plate) => {
    const norm = normalizePlateNumber(plate);
    if (!norm) return null;
    return vehicles.find((v) => normalizePlateNumber(v.plate_number || "") === norm) || null;
  };

  // "적용": server-side lookup by plate INCLUDING soft-deleted past records.
  const onPlateApply = async () => {
    const norm = normalizePlateNumber(form.plate_number);
    if (!norm) {
      setPlateApplied(false);
      toast("차량번호를 입력해 주세요.", "err");
      return;
    }
    setPlateApplied(true); // '적용'을 눌러 확인함 (매칭/신규 무관)
    let list = [];
    try {
      list = await vehicleApi.list({ plate_number: norm, soft_delete_mode: "all" });
    } catch {
      list = vehicles;
    }
    const found =
      (list || []).find((v) => normalizePlateNumber(v.plate_number || "") === norm) || null;
    setMatched(found);
    toast(found ? "기존 차량 정보를 불러왔습니다." : "미등록 차량입니다. 신규로 접수합니다.");
  };

  // Auto-apply once when arriving with a ?plate= (e.g. from 권한 조회). The plate
  // was just verified there, so treat this as an applied lookup.
  useEffect(() => {
    const initial = normalizePlateNumber(params.get("plate") || "");
    if (initial && vehicles.length) {
      setMatched(findMatch(initial));
      setPlateApplied(true);
    }
    // eslint-disable-next-line
  }, [vehicles]);

  const matchedOwnerName = useMemo(
    () => (matched?.user ? ownerNameOf(matched.user) : null),
    [matched, owners]
  );

  // 무단주차 등록 정책: 거주주차·방문주차(권한 있는 차량)는 무단으로 등록 불가.
  // 무단주차/미등록 차량은 등록 가능.
  const matchedType = matched?.parking_type;
  const isBlocked =
    matchedType === PARKING_TYPE.RESIDENT || matchedType === PARKING_TYPE.VISITOR;
  const blockWord =
    matchedType === PARKING_TYPE.RESIDENT
      ? "거주"
      : matchedType === PARKING_TYPE.VISITOR
      ? "방문"
      : "";
  const matchedTitle =
    matchedType === PARKING_TYPE.RESIDENT
      ? "거주 차량입니다."
      : matchedType === PARKING_TYPE.VISITOR
      ? "방문 차량입니다."
      : matchedType === PARKING_TYPE.UNAUTHORIZED
      ? "이미 무단주차 기록이 있는 차량입니다."
      : "기존 등록 차량입니다.";

  async function submit(e) {
    e.preventDefault();
    const normalizedPlate = normalizePlateNumber(form.plate_number);
    if (!normalizedPlate) {
      toast("차량번호를 입력해 주세요.", "err");
      return;
    }
    if (!plateApplied) {
      toast("차량번호 옆 ‘적용’을 눌러 차량을 확인해 주세요.", "err");
      return;
    }
    const existing = matched || findMatch(normalizedPlate);
    if (
      existing &&
      (existing.parking_type === PARKING_TYPE.RESIDENT ||
        existing.parking_type === PARKING_TYPE.VISITOR)
    ) {
      const word = existing.parking_type === PARKING_TYPE.RESIDENT ? "거주" : "방문";
      toast(`${word} 차량은 무단주차로 등록할 수 없습니다.`, "err");
      return;
    }
    setBusy(true);
    try {
      // Reuse the matched vehicle; otherwise create a new unregistered one.
      let vehicle = existing;
      if (!vehicle) {
        vehicle = await vehicleApi.create({
          user: null,
          parking_type: PARKING_TYPE.UNAUTHORIZED,
          vehicle_type: "기타",
          model_name: null,
          plate_number: normalizedPlate,
          color: null,
          tower_yn: false,
          remarks: form.remarks || null,
          is_deleted: false,
        });
      }

      await unauthorizedApi.create({
        plate_number: normalizedPlate,
        phone_number: form.phone_number || null,
        parking_start_time: new Date().toISOString(),
        parking_location: form.parking_location || "기타",
        remarks: form.remarks || null,
        is_deleted: false,
      });
      toast("무단주차로 등록되었습니다.");
      nav("/unauthorized", { replace: true });
    } catch {
      toast("저장에 실패했습니다.", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell bar={<AppBar title="무단주차 등록" sub="Quick" back />} hideTabs>
      <div className="card" style={{ background: "var(--danger-soft)", border: 0 }}>
        <div className="row" style={{ color: "var(--danger)", fontWeight: 600 }}>
          차량번호를 입력해 접수합니다. 주차 시작 시각은 현재 시각으로 기록됩니다.
        </div>
      </div>

      <form onSubmit={submit} style={{ marginTop: 14 }}>
        <Field label="차량번호" hint="번호 입력 후 '적용'을 눌러 기존 차량을 확인합니다.">
          <div className="row" style={{ gap: 8 }}>
            <TextInput
              placeholder="차량번호 입력"
              value={form.plate_number}
              onChange={onPlateInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault(); // Enter = 적용(검색), not form submit
                  onPlateApply();
                }
              }}
              autoFocus
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              type="button"
              className="btn ghost"
              style={{ width: "auto", flexShrink: 0, padding: "13px 18px", whiteSpace: "nowrap" }}
              onClick={onPlateApply}
            >
              적용
            </button>
          </div>
          {form.plate_number.trim() && !plateApplied && (
            <div style={{ marginTop: 6, color: "var(--danger)", fontSize: 12.5, fontWeight: 600 }}>
              ‘적용’을 눌러 차량을 확인해야 등록할 수 있습니다.
            </div>
          )}
        </Field>

        {matched && (
          <div
            className="card"
            style={{
              padding: 12,
              marginTop: 6,
              border: `1px solid ${isBlocked ? "var(--danger)" : "var(--border)"}`,
            }}
          >
            <div style={{ fontWeight: 700, color: isBlocked ? "var(--danger)" : "var(--text)" }}>
              {matchedTitle}
            </div>
            <div className="muted" style={{ marginTop: 4, fontSize: 12.5, display: "grid", gap: 3 }}>
              <span>{[matched.plate_number, matched.vehicle_type, matched.model_name || "모델 미상"].filter(Boolean).join(" · ")}</span>
              <span>주차유형 · {matched.parking_type || "-"}</span>
              <span>소유주 · {matchedOwnerName || "미지정"}</span>
            </div>
            {isBlocked && (
              <div style={{ marginTop: 8, color: "var(--danger)", fontWeight: 700, fontSize: 13 }}>
                {blockWord} 차량은 무단주차로 등록할 수 없습니다.
              </div>
            )}
          </div>
        )}

        <Field label="주차 위치">
          <ChipPicker
            options={LOCATIONS}
            value={form.parking_location}
            onChange={set("parking_location")}
          />
        </Field>

        <Field label="연락처 (선택)" hint="차주 연락처를 알 수 있는 경우 입력하세요.">
          <TextInput
            placeholder="010-0000-0000"
            inputMode="tel"
            maxLength={13}
            value={form.phone_number}
            onChange={onPhoneInput}
          />
        </Field>

        <Field label="비고 (선택)">
          <TextArea
            placeholder="차량 상태 · 위반 내용"
            value={form.remarks}
            onChange={onInput("remarks")}
          />
        </Field>

        <button className="btn danger" disabled={busy || isBlocked || !plateApplied} style={{ marginTop: 8 }}>
          {busy
            ? "저장 중…"
            : isBlocked
            ? `등록 불가 (${blockWord}주차)`
            : !plateApplied
            ? "적용 후 등록"
            : "무단주차 등록"}
        </button>
      </form>
    </Shell>
  );
}
