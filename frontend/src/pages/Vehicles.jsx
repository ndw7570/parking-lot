import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shell, AppBar, Loading, Empty, Badge, AccountButton } from "../components/ui";
import { Segment } from "../components/form";
import { IconSearch, IconCar, IconPlus, IconChevron } from "../components/Icons";
import { vehicleApi, visitantApi } from "../api/resources";
import { decideVerdict, VERDICT, visitExpiry, minutesUntil, formatRemaining } from "../lib/domain";

const FILTERS = [
  { value: "all", label: "전체" },
  { value: VERDICT.DESIGNATED, label: "지정" },
  { value: VERDICT.VISITOR, label: "방문" },
  { value: VERDICT.UNAUTHORIZED, label: "미등록" },
];

// ?filter= 진입(메인 KPI 링크)용 매핑
const FILTER_FROM_PARAM = {
  all: "all",
  designated: VERDICT.DESIGNATED,
  visitor: VERDICT.VISITOR,
  unauthorized: VERDICT.UNAUTHORIZED,
};

export default function Vehicles() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [visitants, setVisitants] = useState([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(FILTER_FROM_PARAM[params.get("filter")] || "all");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [v, vis] = await Promise.all([
          vehicleApi.list(),
          visitantApi.list().catch(() => []),
        ]);
        if (alive) {
          setVehicles(v);
          setVisitants(vis);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => {
    // 차주(user)별 '지정주차' 차량 수 → 초과 표시(지정주차만 카운팅).
    const designatedCounts = {};
    vehicles.forEach((v) => {
      if (v.is_deleted || !v.user) return;
      if (decideVerdict(v, visitants).verdict === VERDICT.DESIGNATED)
        designatedCounts[v.user] = (designatedCounts[v.user] || 0) + 1;
    });
    return vehicles
      .map((v) => {
        const _verdict = decideVerdict(v, visitants);
        let _remaining = null;
        if (_verdict.verdict === VERDICT.VISITOR) {
          const vis = visitants.find(
            (x) => String(x.vehicle) === String(v.vehicle_id) && !x.is_deleted
          );
          _remaining = vis ? minutesUntil(visitExpiry(vis)) : null;
        }
        const _ownerCount =
          _verdict.verdict === VERDICT.DESIGNATED && v.user
            ? designatedCounts[v.user] || 0
            : 0;
        return { ...v, _verdict, _remaining, _ownerCount };
      })
      .filter((v) => {
        if (filter !== "all" && v._verdict.verdict !== filter) return false;
        if (!q.trim()) return true;
        const needle = q.trim().replace(/\s/g, "");
        return (
          (v.plate_number || "").replace(/\s/g, "").includes(needle) ||
          (v.model_name || "").includes(q.trim())
        );
      });
  }, [vehicles, visitants, q, filter]);

  return (
    <Shell bar={<AppBar sub="Vehicles" title="차량 관리" right={<AccountButton />} />}>
      <div className="searchbar">
        <IconSearch width={20} height={20} color="var(--text-faint)" />
        <input
          placeholder="차량번호 · 모델 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <Segment options={FILTERS} value={filter} onChange={setFilter} />

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty
          icon={<IconCar width={26} height={26} />}
          title="차량이 없습니다"
          hint="아래 버튼으로 새 차량을 등록하세요."
        />
      ) : (
        <div className="card" style={{ padding: "4px 16px" }}>
          {rows.map((v) => (
            <VehicleRow
              key={v.vehicle_id}
              v={v}
              onClick={() => nav(`/vehicles/${v.vehicle_id}`)}
            />
          ))}
        </div>
      )}

      <button className="fab" onClick={() => nav("/vehicles/new")} aria-label="차량 등록">
        <IconPlus width={24} height={24} />
      </button>
    </Shell>
  );
}

function VehicleRow({ v, onClick }) {
  const tone =
    v._verdict.verdict === VERDICT.DESIGNATED
      ? "ok"
      : v._verdict.verdict === VERDICT.VISITOR
      ? "warn"
      : "danger";
  const initials = (v.plate_number || "??").slice(-2);
  return (
    <button
      className="list-row"
      onClick={onClick}
      style={{ width: "100%", background: "none", border: 0, textAlign: "left" }}
    >
      <span className="avatar">{initials}</span>
      <span className="grow">
        <span className="title">{v.plate_number || `#${v.vehicle_id}`}</span>
        <span className="meta">
          {[v.vehicle_type, v.model_name, v.color].filter(Boolean).join(" · ") ||
            "정보 없음"}
        </span>
        {v._remaining != null && (
          <span
            className="meta"
            style={{
              color: v._remaining <= 30 ? "var(--danger)" : "var(--cyan-deep)",
              fontWeight: 600,
            }}
          >
            {formatRemaining(v._remaining)}
          </span>
        )}
        {v._ownerCount >= 2 && (
          <span
            style={{
              alignSelf: "flex-start",
              marginTop: 4,
              fontSize: 11,
              fontWeight: 700,
              color: "#b45309",
              background: "#fef3c7",
              borderRadius: 999,
              padding: "2px 8px",
            }}
          >
            초과({v._ownerCount})
          </span>
        )}
      </span>
      <Badge tone={tone}>{v._verdict.label}</Badge>
      <IconChevron width={18} height={18} color="var(--text-faint)" />
    </button>
  );
}
