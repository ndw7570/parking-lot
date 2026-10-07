import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, AppBar, Loading, Empty, Badge, useToast, AccountButton } from "../components/ui";
import { Segment } from "../components/form";
import { IconAlert, IconPlus, IconCheck, IconPhone } from "../components/Icons";
import { unauthorizedApi } from "../api/resources";
import { authApi } from "../api/auth";
import { formatDateTime } from "../lib/domain";

const VIEWS = [
  { value: "open", label: "주차 중" },
  { value: "closed", label: "종료" },
  { value: "all", label: "전체" },
];

export default function Unauthorized() {
  const nav = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [view, setView] = useState("open");
  const [processor, setProcessor] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const list = await unauthorizedApi.list();
      setRecords(list);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    authApi.me().catch(() => null).then((me) => setProcessor(me));
  }, []);

  const rows = useMemo(() => {
    return records.filter((r) => {
      if (view === "open") return !r.parking_end_time;
      if (view === "closed") return Boolean(r.parking_end_time);
      return true;
    });
  }, [records, view]);

  async function close(r) {
    try {
      await unauthorizedApi.patch(r.vehicle_id, {
        parking_end_time: new Date().toISOString(),
      });
      const processorLabel = processor?.user_name || processor?.username || "관리자";
      toast(`출차 처리되었습니다. 처리자: ${processorLabel}`);
      load();
    } catch {
      toast("처리에 실패했습니다.", "err");
    }
  }

  return (
    <Shell bar={<AppBar sub="Unauthorized" title="무단주차" right={<AccountButton />} />}>
      <Segment options={VIEWS} value={view} onChange={setView} />

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty
          icon={<IconAlert width={26} height={26} />}
          title="무단주차 기록이 없습니다"
          hint="빠른 등록으로 미등록 차량을 접수하세요."
        />
      ) : (
        <div className="stack">
          {rows.map((r) => (
            <div className="card" key={r.vehicle_id}>
              <div className="row between">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {r.plate_number}
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                    {r.parking_location || "위치 미상"}
                  </div>
                </div>
                <Badge tone={r.parking_end_time ? "neutral" : "danger"}>
                  {r.parking_end_time ? "종료" : "주차 중"}
                </Badge>
              </div>
              <div className="detail-line" style={{ marginTop: 6 }}>
                <span className="k">주차 시작</span>
                <span className="v">{formatDateTime(r.parking_start_time)}</span>
              </div>
              {r.parking_end_time && (
                <div className="detail-line">
                  <span className="k">주차 종료</span>
                  <span className="v">{formatDateTime(r.parking_end_time)}</span>
                </div>
              )}
              {r.phone_number && (
                <div className="detail-line">
                  <span className="k">연락처</span>
                  <span className="v">
                    <a
                      href={`tel:${r.phone_number}`}
                      style={{ color: "var(--cyan-deep)", fontWeight: 600 }}
                    >
                      {r.phone_number}
                    </a>
                  </span>
                </div>
              )}
              {r.parking_end_time && (
                <div className="detail-line">
                  <span className="k">처리자</span>
                  <span className="v">
                    {processor?.user_name || processor?.username || "관리자"}
                  </span>
                </div>
              )}
              {!r.parking_end_time && (
                <div className="btn-row" style={{ marginTop: 12 }}>
                  {r.phone_number && (
                    <a className="btn ghost" href={`tel:${r.phone_number}`}>
                      <IconPhone width={17} height={17} /> 전화
                    </a>
                  )}
                  <button className="btn primary" onClick={() => close(r)}>
                    <IconCheck width={17} height={17} /> 출차 처리
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        className="fab"
        onClick={() => nav("/unauthorized/new")}
        aria-label="무단주차 등록"
      >
        <IconPlus width={24} height={24} />
      </button>
    </Shell>
  );
}
