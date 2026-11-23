import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, AppBar, Loading, Empty, Badge } from "../components/ui";
import { Segment } from "../components/form";
import { IconAlert } from "../components/Icons";
import { reportApi, REPORT_STATUS } from "../api/resources";
import { authApi, isAdminUser } from "../api/auth";
import { formatDateTime } from "../lib/domain";

const VIEWS = [
  { value: "open", label: "처리 전" },
  { value: "closed", label: "끝남" },
];

// 관리자: 모든 신고(신고함). 거주민: 내가 낸 신고. 무엇을 보여 줄지는 서버가 계정으로 가른다.
export default function Reports() {
  const nav = useNavigate();
  const [admin, setAdmin] = useState(false);
  const [view, setView] = useState("open");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    authApi.me().then((me) => setAdmin(isAdminUser(me))).catch(() => setAdmin(false));
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    reportApi
      .list({ status: view })
      .then((list) => alive && setRows(list))
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [view]);

  return (
    <Shell bar={<AppBar back sub="Reports" title={admin ? "신고함" : "내 신고"} />} hideTabs>
      <Segment options={VIEWS} value={view} onChange={setView} />
      {loading ? (
        <Loading />
      ) : failed ? (
        <Empty icon={<IconAlert width={26} height={26} />} title="신고를 불러오지 못했습니다" hint="잠시 후 다시 열어 주세요." />
      ) : rows.length === 0 ? (
        <Empty
          icon={<IconAlert width={26} height={26} />}
          title={view === "open" ? "처리 전 신고가 없습니다" : "끝난 신고가 없습니다"}
          hint={admin ? null : "권한 조회에서 무단 판정이 나오면 신고할 수 있습니다."}
        />
      ) : (
        <div className="stack">
          {rows.map((r) => {
            const st = REPORT_STATUS[r.report_status] || { label: r.report_status, tone: "neutral" };
            return (
              <button key={r.id} type="button" className="card" style={{ textAlign: "left" }} onClick={() => nav(`/reports/${r.id}`)}>
                <div className="row between">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{r.plate_number}</div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                      {r.parking_location || "위치 미상"} · {formatDateTime(r.parking_start_time)}
                      {r.report_count > 1 ? ` · 신고 ${r.report_count}회` : ""}
                      {r.photos?.length ? ` · 사진 ${r.photos.length}` : ""}
                    </div>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
