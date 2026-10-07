import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shell, AppBar, Loading, Empty, Badge, AccountButton } from "../components/ui";
import { Segment } from "../components/form";
import { IconSearch, IconPlus, IconPhone, IconHome } from "../components/Icons";
import { dongHoApi, userProfileApi } from "../api/resources";
import { homeStatus, formatDate, buildUnitNames } from "../lib/domain";

const VIEWS = [
  { value: "all", label: "전체" },
  { value: "occupied", label: "거주 중" },
  { value: "empty", label: "빈집" },
];

export default function Residents() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [dongHos, setDongHos] = useState([]);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [view, setView] = useState(
    VIEWS.some((v) => v.value === params.get("filter")) ? params.get("filter") : "all"
  );
  const [creatingHome, setCreatingHome] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [dh, us] = await Promise.all([
          dongHoApi.list(),
          userProfileApi.list().catch(() => []),
        ]);
        if (alive) {
          setDongHos(dh);
          setUsers(us);
        }
      } catch {
        if (alive) {
          setDongHos([]);
          setUsers([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);


  const userMap = useMemo(() => {
    const m = {};
    users.forEach((u) => (m[u.user_id] = u));
    return m;
  }, [users]);

  const allRows = useMemo(() => {
    const existingByName = new Map((dongHos || []).map((d) => [String(d.dong_ho_name || ""), d]));
    const allUnits = buildUnitNames();
    return allUnits.map((unit) => {
      const existing = existingByName.get(unit);
      if (existing) {
        return { ...existing, _status: homeStatus(existing), _owner: userMap[existing.user] };
      }
      return {
        dong_ho_id: `placeholder-${unit}`,
        dong_ho_name: unit,
        user: null,
        _status: { key: "empty", label: "빈집", tone: "danger" },
        _owner: null,
        __isPlaceholder: true,
      };
    });
  }, [dongHos, userMap]);

  const rows = useMemo(() => {
    return allRows.filter((d) => {
      if (view === "empty" && d._status.key !== "empty") return false;
      if (view === "occupied" && d._status.key === "empty") return false;
      if (!q.trim()) return true;
      const s = q.trim();
      return (
        (d.dong_ho_name || "").includes(s) ||
        (d._owner?.user_name || "").includes(s)
      );
    });
  }, [allRows, q, view]);

  const emptyCount = allRows.filter((d) => d._status.key === "empty").length;
  const occupiedCount = allRows.filter((d) => d._status.key !== "empty").length;

  async function openLinkPage(d) {
    if (d.__isPlaceholder) {
      setCreatingHome(true);
      try {
        const created = await dongHoApi.create({
          dong_ho_name: d.dong_ho_name,
          user: null,
          admin_check: false,
          remarks: null,
        });
        setDongHos((prev) => [...prev, created]);
        nav(`/residents/${created.dong_ho_id}/link`);
      } catch {
        setCreatingHome(false);
      }
      return;
    }
    nav(`/residents/${d.dong_ho_id}/link`);
  }

  return (
    <Shell bar={<AppBar sub="Residents" title="거주민 관리" right={<AccountButton />} />}>
      <div className="kpi-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <div className="kpi">
          <div className="n">{allRows.length}</div>
          <div className="l">세대</div>
        </div>
        <div className="kpi accent">
          <div className="n">{occupiedCount}</div>
          <div className="l">거주</div>
        </div>
        <div className="kpi danger">
          <div className="n">{emptyCount}</div>
          <div className="l">빈집</div>
        </div>
      </div>

      <div className="searchbar" style={{ marginTop: 14 }}>
        <IconSearch width={20} height={20} color="var(--text-faint)" />
        <input
          placeholder="호수 · 이름 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <Segment options={VIEWS} value={view} onChange={setView} />

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty
          icon={<IconHome width={26} height={26} />}
          title="해당하는 세대가 없습니다"
        />
      ) : (
        <div className="card" style={{ padding: "4px 16px" }}>
          {rows.map((d) => (
            <button
              type="button"
              className="list-row"
              key={d.dong_ho_id}
              onClick={() => openLinkPage(d)}
              style={{ width: "100%", background: "none", border: 0, textAlign: "left" }}
            >
              <span className="avatar" style={{ background: "var(--navy-700)" }}>
                <IconHome width={20} height={20} />
              </span>
              <span className="grow">
                <span className="title">{d.dong_ho_name || `세대 #${d.dong_ho_id}`}</span>
                <span className="meta">
                  {d._owner?.user_name || "미등록"}
                  {d.exp_resi_end_date
                    ? ` · ~${formatDate(d.exp_resi_end_date)}`
                    : ""}
                </span>
              </span>
              {d._owner?.phone_number && (
                <a
                  href={`tel:${d._owner.phone_number}`}
                  className="icon-btn phone-action"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="전화"
                >
                  <IconPhone width={17} height={17} />
                </a>
              )}
              <Badge tone={d._status.tone}>{d._status.label}</Badge>
            </button>
          ))}
        </div>
      )}

      <button
        className="fab"
        onClick={() => nav("/residents/new")}
        aria-label="거주민 등록"
        disabled={creatingHome}
      >
        <IconPlus width={24} height={24} />
      </button>
    </Shell>
  );
}
