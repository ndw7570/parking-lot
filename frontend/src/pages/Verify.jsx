import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shell, AppBar } from "../components/ui";
import { Field } from "../components/form";
import { IconSearch, IconPhone, IconCar, IconCamera } from "../components/Icons";
import { vehicleApi, visitantApi } from "../api/resources";
import { canScanPlate, scanPlate } from "../lib/plateScanner";
import { isDemo } from "../api/config";
import { PlateScanDemo } from "../components/PlateScanDemo";
import { decideVerdict, VERDICT, PARKING_TYPE, plateSearchParams } from "../lib/domain";
import { errorMessage, logError } from "../lib/apiError";

// 조회된 차량의 parking_type 을 그대로 판정으로 매핑한다.
//   무단주차 → 무단주차 / 거주주차·지정주차 → 거주주차 / 방문주차 → 방문주차
//   지정주차는 앱이 저장하지 않는 옛 값이라 목록·상세와 같은 이름으로 보인다(P005-031).
export function verdictFromType(parkingType) {
  switch (parkingType) {
    case PARKING_TYPE.UNAUTHORIZED:
      return { verdict: VERDICT.UNAUTHORIZED, label: "무단주차", sub: "무단주차 차량", allowed: false };
    case PARKING_TYPE.VISITOR:
      return { verdict: VERDICT.VISITOR, label: "방문주차", sub: "등록된 방문 차량", allowed: true };
    case PARKING_TYPE.RESIDENT:
    case PARKING_TYPE.DESIGNATED:
      return { verdict: VERDICT.DESIGNATED, label: "거주주차", sub: "거주민 등록 차량", allowed: true };
    default:
      return { verdict: VERDICT.UNAUTHORIZED, label: parkingType || "미등록", sub: "미등록 차량", allowed: false };
  }
}

export default function Verify() {
  const nav = useNavigate();
  const [plate, setPlate] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoScanOpen, setDemoScanOpen] = useState(false);
  const [candidates, setCandidates] = useState([]); // multiple LIKE matches to pick from
  const [result, setResult] = useState(null); // { verdict, vehicle, owner }
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null); // 조회 실패(400/네트워크) — '미등록'과 구분

  // 홈의 카메라 버튼으로 들어오면(?scan=1) 바로 촬영을 연다. 한 번만 열고 주소에서 표시를 지운다 -
  // 남겨 두면 다른 화면에 갔다 돌아올 때마다 카메라가 다시 열린다.
  const [searchParams, setSearchParams] = useSearchParams();
  const autoScanned = useRef(false);
  useEffect(() => {
    if (autoScanned.current || searchParams.get("scan") !== "1") return;
    autoScanned.current = true;
    setSearchParams({}, { replace: true });
    if (canScanPlate()) scan();
  }, [searchParams, setSearchParams]); // eslint-disable-line react-hooks/exhaustive-deps -- scan 은 매 렌더 새로 만들어지지만 한 번만 부른다

  async function run(e) {
    e?.preventDefault();
    await lookup(plate.trim());
  }

  // 앱(Android)에서만: 카메라로 읽은 번호를 입력칸에 채우고 바로 조회한다.
  // 입력칸에 남겨 두는 건 오인식이면 사람이 고쳐 다시 조회할 수 있게 하려는 것이다.
  async function scan() {
    setError(null);
    let read;
    try {
      read = await scanPlate();
    } catch (err) {
      setError(
        err?.code === "PERMISSION_DENIED"
          ? "카메라 권한을 허용해야 번호판을 읽을 수 있습니다."
          : "카메라를 열지 못했습니다. 번호를 직접 입력해 주세요."
      );
      return;
    }
    if (!read) return; // 사용자가 닫음 -> 직접 입력
    setPlate(read);
    await lookup(read);
  }

  // 웹 데모 전용 인식 체험(P005-019): 예시 번호를 채우고 실제 앱처럼 바로 조회한다.
  const finishDemoScan = useCallback((plateNo) => {
    setDemoScanOpen(false);
    setPlate(plateNo);
    lookup(plateNo);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- lookup 은 상태 setter 만 쓴다
  const closeDemoScan = useCallback(() => setDemoScanOpen(false), []);

  async function lookup(q) {
    if (!q) return;
    setBusy(true);
    setResult(null);
    setCandidates([]);
    setNotFound(false);
    setError(null);
    try {
      // 차량번호로 서버 조회 — 활성(is_deleted=False) 차량만.
      //   GET /api/parking/vehicle/?plate_number_contains={q}  (번호 일부)
      let matches;
      try {
        matches = await vehicleApi.list(plateSearchParams(q));
      } catch (err) {
        // 400 등 조회 실패 → '미등록'이 아니라 에러 메시지로 구분한다.
        logError("verify-lookup", err);
        setError(
          err.response?.status === 400
            ? "차량번호 조회를 사용할 수 없습니다. (서버가 번호 일부 검색을 지원하지 않음)"
            : errorMessage(err, "차량번호를 조회하지 못했습니다.")
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

  // 방문 차량은 유형 값만으로 판정하면 만료된 티켓도 "방문"이 된다(B-08). 티켓을 확인한다.
  async function judge(vehicle) {
    if (vehicle.parking_type !== PARKING_TYPE.VISITOR) return verdictFromType(vehicle.parking_type);
    const visitants = await visitantApi.list();
    return decideVerdict(vehicle, visitants);
  }

  async function showVerdict(vehicle) {
    setBusy(true);
    // 후보 목록에서 다시 고를 때 앞 후보의 오류 카드가 남지 않게 한다.
    setError(null);
    try {
      let verdict;
      try {
        verdict = await judge(vehicle);
      } catch {
        // 티켓을 못 읽었는데 "만료 → 무단"으로 보여 주면 실제 방문객이 단속당한다.
        setError("방문 티켓을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
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
        {canScanPlate() && (
          // 결과가 나온 뒤에는 [거주민에게 전화]가 시안이다. 화면에 시안 버튼을 둘 두지 않는다.
          <button
            type="button"
            className={`btn ${result ? "ghost" : "signal"}`}
            style={{ marginTop: 10 }}
            disabled={busy}
            onClick={scan}
          >
            <IconCamera width={19} height={19} />
            {result ? "다시 찍기" : "카메라로 번호판 읽기"}
          </button>
        )}
        {!canScanPlate() && isDemo() && (
          // 웹 데모에서만. 앱에서는 진짜 카메라 인식이 있으니 보이지 않는다.
          <button
            type="button"
            className={`btn ${result ? "ghost" : "signal"}`}
            style={{ marginTop: 10 }}
            disabled={busy}
            onClick={() => setDemoScanOpen(true)}
          >
            <IconCamera width={19} height={19} />
            번호판 인식 체험
          </button>
        )}
        {demoScanOpen && <PlateScanDemo onDone={finishDemoScan} onClose={closeDemoScan} />}
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
          {/* 일부 번호로 찾았으면 입력값이 아니라 찾은 차량의 전체 번호를 보여 준다. */}
          <VerdictCard result={result} plate={result.vehicle?.plate_number || plate.trim()} />

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
