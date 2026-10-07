import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, AppBar } from "../components/ui";
import { Field } from "../components/form";
import { IconSearch, IconPhone, IconCar } from "../components/Icons";
import { vehicleApi } from "../api/resources";
import { decideVerdict, VERDICT, PARKING_TYPE } from "../lib/domain";

// 조회된 차량의 parking_type 을 그대로 판정으로 매핑한다.
//   무단주차 → 무단주차 / 거주주차 → 거주주차 / 방문주차 → 방문주차 / 지정주차 → 지정주차
function verdictFromType(parkingType) {
  switch (parkingType) {
    case PARKING_TYPE.UNAUTHORIZED:
      return { verdict: VERDICT.UNAUTHORIZED, label: "무단주차", sub: "무단주차 차량", allowed: false };
    case PARKING_TYPE.VISITOR:
      return { verdict: VERDICT.VISITOR, label: "방문주차", sub: "등록된 방문 차량", allowed: true };
    case PARKING_TYPE.RESIDENT:
      return { verdict: VERDICT.DESIGNATED, label: "거주주차", sub: "거주민 등록 차량", allowed: true };
    case PARKING_TYPE.DESIGNATED:
      return { verdict: VERDICT.DESIGNATED, label: "지정주차", sub: "지정 차량", allowed: true };
    default:
      return { verdict: VERDICT.UNAUTHORIZED, label: parkingType || "미등록", sub: "미등록 차량", allowed: false };
  }
}

export default function Verify() {
  const nav = useNavigate();
  const [plate, setPlate] = useState("");
  const [busy, setBusy] = useState(false);
  const [candidates, setCandidates] = useState([]); // multiple LIKE matches to pick from
  const [result, setResult] = useState(null); // { verdict, vehicle, owner }
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null); // 조회 실패(400/네트워크) — '미등록'과 구분

  async function run(e) {
    e?.preventDefault();
    const q = plate.trim();
    if (!q) return;
    setBusy(true);
    setResult(null);
    setCandidates([]);
    setNotFound(false);
    setError(null);
    try {
      // 차량번호로 서버 조회 — 활성(is_deleted=False) 차량만.
      //   GET /api/parking/vehicle/?plate_number={q}
      let matches;
      try {
        matches = await vehicleApi.list({ plate_number: q });
      } catch (err) {
        // 400 등 조회 실패 → '미등록'이 아니라 에러 메시지로 구분한다.
        const status = err.response?.status;
        setError(
          status === 400
            ? "차량번호 조회를 사용할 수 없습니다. (서버가 plate_number 검색을 지원하지 않음)"
            : "차량번호 조회에 실패했습니다. 잠시 후 다시 시도해 주세요."
        );
        return;
      }
      matches = (matches || []).filter((v) => !v.is_deleted);

      if (matches.length === 0) {
        setNotFound(true);
        setResult({ ...decideVerdict(null), vehicle: null, owner: null });
      } else if (matches.length === 1) {
        await showVerdict(matches[0]);
      } else {
        setCandidates(matches);
      }
    } finally {
      setBusy(false);
    }
  }

  async function showVerdict(vehicle) {
    setBusy(true);
    try {
      const verdict = verdictFromType(vehicle.parking_type);
      let owner = null;
      try {
        const detail = await vehicleApi.get(vehicle.vehicle_id);
        owner = detail.users || null;
      } catch {
        /* ignore */
      }
      setNotFound(false);
      setCandidates([]);
      setResult({ ...verdict, vehicle, owner });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell bar={<AppBar title="주차 권한 확인" sub="Verify" back />}>
      <form onSubmit={run}>
        <Field label="차량번호" hint="번호 일부만 입력해도 조회됩니다. (부분 검색)">
          <div className="searchbar">
            <IconSearch width={20} height={20} color="var(--text-faint)" />
            <input
              placeholder="예) 12가 3456 · 3456 · 12"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              inputMode="text"
              autoFocus
            />
          </div>
        </Field>
        <button className="btn primary" disabled={busy || !plate.trim()}>
          {busy ? "조회 중…" : "권한 조회"}
        </button>
      </form>

      {error && (
        <div
          className="card"
          style={{
            marginTop: 16,
            padding: 14,
            background: "var(--danger-soft)",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {candidates.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="muted" style={{ marginBottom: 8 }}>
            {candidates.length}건이 검색되었습니다. 조회할 차량을 선택하세요.
          </div>
          <div className="stack">
            {candidates.map((v) => (
              <button
                key={v.vehicle_id}
                type="button"
                className="card"
                onClick={() => showVerdict(v)}
                style={{ textAlign: "left", padding: 12 }}
              >
                <div style={{ fontWeight: 700 }}>
                  {v.plate_number || `#${v.vehicle_id}`}
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                  {v.vehicle_type || "-"} · {v.model_name || "모델 미상"}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 18 }}>
          <VerdictCard result={result} plate={plate.trim()} />

          {result.vehicle && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="detail-line">
                <span className="k">차종</span>
                <span className="v">{result.vehicle.vehicle_type || "-"}</span>
              </div>
              <div className="detail-line">
                <span className="k">모델</span>
                <span className="v">{result.vehicle.model_name || "-"}</span>
              </div>
              <div className="detail-line">
                <span className="k">색상</span>
                <span className="v">{result.vehicle.color || "-"}</span>
              </div>
              <div className="detail-line">
                <span className="k">타워 주차</span>
                <span className="v">
                  {result.vehicle.tower_yn ? "가능" : "불가"}
                </span>
              </div>
              {result.owner && (
                <>
                  <div className="detail-line">
                    <span className="k">거주민</span>
                    <span className="v">{result.owner.user_name || "-"}</span>
                  </div>
                  <div className="detail-line">
                    <span className="k">연락처</span>
                    <span className="v">
                      {result.owner.phone_number ? (
                        <a
                          href={`tel:${result.owner.phone_number}`}
                          style={{ color: "var(--cyan-deep)", fontWeight: 600 }}
                        >
                          {result.owner.phone_number}
                        </a>
                      ) : (
                        "-"
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {result.owner?.phone_number && (
            <a
              className="btn signal"
              href={`tel:${result.owner.phone_number}`}
              style={{ marginTop: 12 }}
            >
              <IconPhone width={19} height={19} />
              거주민에게 전화
            </a>
          )}

          {notFound && (
            <button
              className="btn danger"
              style={{ marginTop: 12 }}
              onClick={() =>
                nav(`/unauthorized/new?plate=${encodeURIComponent(plate.trim())}`)
              }
            >
              <IconCar width={19} height={19} />이 차량 무단주차로 등록
            </button>
          )}
        </div>
      )}
    </Shell>
  );
}

function VerdictCard({ result, plate }) {
  const tone =
    result.verdict === VERDICT.DESIGNATED
      ? "ok"
      : result.verdict === VERDICT.VISITOR
      ? "warn"
      : "danger";
  return (
    <div className={`verdict ${tone}`}>
      <div className="eyebrow">주차 판정</div>
      <div className="big">{result.label}</div>
      <div className="sub">
        {result.allowed ? "정상 주차 차량입니다" : result.sub}
      </div>
      <div className="plate">
        <IconCar width={16} height={16} />
        {plate || "번호 미상"}
      </div>
    </div>
  );
}
