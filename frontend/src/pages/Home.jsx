import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, AppBar, Loading, AccountButton } from "../components/ui";
import { IconCar, IconGate, IconUsers, IconMoto, IconAlert } from "../components/Icons";
import {
  vehicleApi,
  visitantApi,
  unauthorizedApi,
  dongHoApi,
} from "../api/resources";
import { homeStatus, buildUnitNames } from "../lib/domain";

// dong_ho_name → canonical unit ("801호"), tolerant of junk names ("801", "").
const toUnit = (name) => {
  const digits = String(name || "").replace(/\D/g, "").slice(0, 4);
  return digits ? `${digits}호` : "";
};

function KPI({ n, l, tone, onClick }) {
  return (
    <div
      className={`kpi ${tone || ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <div className="n">{n}</div>
      <div className="l">{l}</div>
    </div>
  );
}

function ActionTile({ Icon, title, desc, onClick, hot }) {
  return (
    <button className={`action-tile ${hot ? "hot" : ""}`} onClick={onClick}>
      <span className="glyph">
        <Icon width={22} height={22} />
      </span>
      <span className="t">{title}</span>
      <span className="d">{desc}</span>
    </button>
  );
}

export default function Home() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    vehicles: [],
    visitants: [],
    unauthorized: [],
    dongHos: [],
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [vehicles, visitants, unauthorized, dongHos] = await Promise.all([
          vehicleApi.list().catch(() => []),
          visitantApi.list().catch(() => []),
          unauthorizedApi.list().catch(() => []),
          dongHoApi.list().catch(() => []),
        ]);
        if (alive) setData({ vehicles, visitants, unauthorized, dongHos });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const total = data.vehicles.length;
    const visiting = data.visitants.length;
    const unauthorized = data.unauthorized.filter((u) => !u.is_deleted).length;
    // 빈집 = 정규 세대(52) 중 거주민이 없는 곳. 잡동사니 dong_ho에 안 휘둘리도록
    // "실제 거주 중인 정규 세대"를 빼서 계산한다.
    const occupiedUnits = new Set(
      data.dongHos
        .filter((d) => homeStatus(d).key !== "empty")
        .map((d) => toUnit(d.dong_ho_name))
        .filter(Boolean)
    );
    const empty = buildUnitNames().filter((u) => !occupiedUnits.has(u)).length;
    return { total, visiting, unauthorized, empty };
  }, [data]);

  // Weekly registration trend (last 4 buckets) from visitant records.
  const weekly = useMemo(() => buildWeekly(data.visitants), [data.visitants]);

  return (
    <Shell
      bar={
        <AppBar
          sub="Parking Desk"
          title="주차 관리"
          right={<AccountButton />}
        />
      }
    >
      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="kpi-row">
            <KPI n={stats.total} l="등록 차량" onClick={() => nav("/vehicles?filter=all")} />
            <KPI n={stats.visiting} l="방문 차량" tone="accent" onClick={() => nav("/vehicles?filter=visitor")} />
            <KPI n={stats.unauthorized} l="무단주차" tone="danger" onClick={() => nav("/vehicles?filter=unauthorized")} />
            <KPI n={stats.empty} l="빈집" onClick={() => nav("/residents?filter=empty")} />
          </div>

          <div className="section-title">빠른 등록</div>
          <div className="action-grid">
            <ActionTile
              Icon={IconCar}
              title="방문차량 등록"
              desc="방문 예약 · 24시간 유효"
              hot
              onClick={() => nav("/vehicles/new?type=visitor")}
            />
            <ActionTile
              Icon={IconGate}
              title="입·출차 제어"
              desc="입·출차 차량 관리"
              onClick={() => nav("/vehicles")}
            />
            <ActionTile
              Icon={IconUsers}
              title="거주민 등록"
              desc="입주민 · 임시거주"
              onClick={() => nav("/residents/new")}
            />
            <ActionTile
              Icon={IconAlert}
              title="무단주차 등록"
              desc="빠른 차량번호 접수"
              onClick={() => nav("/unauthorized/new")}
            />
          </div>

          <div className="section-title">주간 방문 등록</div>
          <div className="card">
            <div className="bars">
              {weekly.map((w) => (
                <div className="bar" key={w.label}>
                  <span className="val">{w.value}</span>
                  <span
                    className="col"
                    style={{
                      height: `${
                        weekly.max ? (w.value / weekly.max) * 100 : 2
                      }%`,
                    }}
                  />
                  <span className="cap">{w.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section-title">권한 확인</div>
          <button
            className="btn signal"
            onClick={() => nav("/verify")}
            style={{ marginBottom: 4 }}
          >
            <IconMoto width={20} height={20} />
            차량번호로 주차 권한 조회
          </button>
        </>
      )}
    </Shell>
  );
}

function buildWeekly(visitants) {
  const buckets = [];
  const now = new Date();
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i * 7);
    buckets.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      start: new Date(d.getFullYear(), d.getMonth(), d.getDate() - 6),
      end: d,
      value: 0,
    });
  }
  visitants.forEach((v) => {
    // 백엔드가 created_at 을 안 주거나 이름이 다르면 카운트가 0이 된다.
    // 흔한 대체 필드명까지 시도하고, 파싱 실패도 걸러낸다.
    const raw = v.created_at ?? v.created ?? v.reg_date ?? v.visit_date;
    const created = raw ? new Date(raw) : null;
    if (!created || Number.isNaN(created.getTime())) return;
    const b = buckets.find((x) => created >= x.start && created <= x.end);
    if (b) b.value += 1;
  });
  const max = Math.max(1, ...buckets.map((b) => b.value));
  const arr = buckets.map((b) => ({ label: b.label, value: b.value }));
  arr.max = max;
  return arr;
}
