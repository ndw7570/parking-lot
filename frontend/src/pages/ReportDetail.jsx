import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Shell, AppBar, Loading, Empty, Badge, useToast } from "../components/ui";
import { TextArea } from "../components/form";
import { IconAlert, IconCheck } from "../components/Icons";
import { reportApi, REPORT_STATUS, isOpenReport } from "../api/resources";
import { authApi, isAdminUser, meIdentity } from "../api/auth";
import { formatDateTime } from "../lib/domain";

// 신고 상세 (P005-025). 관리자는 처리·반려·영구보관, 신고자는 결과 확인과 접수 상태일 때 취소.
export default function ReportDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [report, setReport] = useState(null);
  const [me, setMe] = useState(null);
  const [failed, setFailed] = useState(false);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const autoChecked = useRef(false);

  const admin = isAdminUser(me);

  useEffect(() => {
    let alive = true;
    Promise.all([reportApi.get(id), authApi.me().catch(() => null)])
      .then(([r, m]) => {
        if (!alive) return;
        setReport(r);
        setMe(m);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [id]);

  // 관리자가 접수 상태 신고를 열면 '확인 중'으로 바꾼다 - 신고자가 누군가 보고 있다는 걸 안다.
  useEffect(() => {
    if (!report || !admin || autoChecked.current || report.report_status !== "RECEIVED") return;
    autoChecked.current = true;
    reportApi.patch(report.id, { report_status: "CHECKING" }).then(setReport).catch(() => {});
  }, [report, admin]);

  // 사진은 로그인 헤더가 필요해서 받아서 띄운다. 화면을 떠나면 메모리에서 지운다.
  const photoKey = (report?.photos || []).map((p) => p.id).join(",");
  useEffect(() => {
    if (!report?.photos?.length) return undefined;
    let alive = true;
    const made = [];
    Promise.all(report.photos.map((p) => reportApi.photoUrl(report.id, p.id).catch(() => null))).then((urls) => {
      urls.forEach((u) => u && u.startsWith("blob:") && made.push(u));
      if (alive) setPhotoUrls(urls.filter(Boolean));
    });
    return () => {
      alive = false;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [report?.id, photoKey]); // eslint-disable-line react-hooks/exhaustive-deps -- 사진 목록이 바뀔 때만 다시 받는다

  async function change(payload, message) {
    setBusy(true);
    try {
      setReport(await reportApi.patch(report.id, payload));
      toast(message);
      setRejecting(false);
    } catch (err) {
      const d = err.response?.data;
      toast(d?.reject_reason?.[0] || d?.report_status?.[0] || d?.detail || "처리하지 못했습니다.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      await reportApi.cancel(report.id);
      toast("신고를 취소했습니다.");
      nav("/reports", { replace: true });
    } catch (err) {
      toast(err.response?.data?.detail || "취소하지 못했습니다.", "err");
      setBusy(false);
    }
  }

  if (failed) {
    return (
      <Shell bar={<AppBar back title="신고" />} hideTabs>
        <Empty icon={<IconAlert width={26} height={26} />} title="신고를 찾을 수 없습니다" />
      </Shell>
    );
  }
  if (!report) {
    return (
      <Shell bar={<AppBar back title="신고" />} hideTabs>
        <Loading />
      </Shell>
    );
  }

  const st = REPORT_STATUS[report.report_status] || { label: report.report_status, tone: "neutral" };
  const open = isOpenReport(report);
  const mineFirst = report.reported_by && report.reported_by === meIdentity(me);

  return (
    <Shell bar={<AppBar back sub="Report" title={report.plate_number} />} hideTabs>
      <div className="row between">
        <div style={{ fontWeight: 700, fontSize: 20 }}>{report.plate_number}</div>
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>

      {photoUrls.length > 0 ? (
        <div className="stack" style={{ marginTop: 12 }}>
          {photoUrls.map((u, i) => (
            <a key={u} href={u} target="_blank" rel="noreferrer" className="report-photo">
              <img src={u} alt={`신고 사진 ${i + 1}`} />
            </a>
          ))}
        </div>
      ) : (
        <div className="muted" style={{ marginTop: 12, fontSize: 13 }}>
          {report.photos?.length ? "사진을 불러오는 중..." : "사진 없음 (또는 보관 기한이 지나 지워짐)"}
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="detail-line"><span className="k">위치</span><span className="v">{report.parking_location || "-"}</span></div>
        <div className="detail-line"><span className="k">신고 시각</span><span className="v">{formatDateTime(report.parking_start_time)}</span></div>
        {report.report_count > 1 && (
          <div className="detail-line"><span className="k">신고 횟수</span><span className="v">{report.report_count}회</span></div>
        )}
        {admin && (
          <div className="detail-line"><span className="k">신고자</span><span className="v">{report.reported_by || "-"}</span></div>
        )}
        {report.remarks && (
          <div className="detail-line"><span className="k">메모</span><span className="v" style={{ whiteSpace: "pre-wrap" }}>{report.remarks}</span></div>
        )}
        {report.closed_at && (
          <div className="detail-line"><span className="k">처리 시각</span><span className="v">{formatDateTime(report.closed_at)}</span></div>
        )}
        {report.reject_reason && (
          <div className="detail-line"><span className="k">반려 사유</span><span className="v">{report.reject_reason}</span></div>
        )}
        {report.photos?.length > 0 && (
          <div className="detail-line">
            <span className="k">사진 보관</span>
            <span className="v">{report.photo_keep ? "영구보관" : "처리 후 30일"}</span>
          </div>
        )}
      </div>

      {admin && open && !rejecting && (
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button className="btn ghost" disabled={busy} onClick={() => setRejecting(true)}>반려</button>
          <button className="btn primary" disabled={busy} onClick={() => change({ report_status: "DONE" }, "처리 완료했습니다. 무단주차 기록도 종료됩니다.")}>
            <IconCheck width={17} height={17} /> 처리 완료
          </button>
        </div>
      )}
      {admin && rejecting && (
        <div className="card" style={{ marginTop: 12 }}>
          <TextArea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="반려 사유 (신고자에게 보입니다)" autoFocus />
          <div className="btn-row" style={{ marginTop: 8 }}>
            <button className="btn ghost" onClick={() => setRejecting(false)}>취소</button>
            <button className="btn danger" disabled={busy || !reason.trim()} onClick={() => change({ report_status: "REJECTED", reject_reason: reason.trim() }, "반려했습니다.")}>
              반려하기
            </button>
          </div>
        </div>
      )}
      {admin && report.photos?.length > 0 && (
        <button
          className="btn ghost"
          style={{ marginTop: 10 }}
          disabled={busy}
          onClick={() => change({ photo_keep: !report.photo_keep }, report.photo_keep ? "영구보관을 풀었습니다." : "사진을 영구보관합니다.")}
        >
          {report.photo_keep ? "영구보관 해제" : "사진 영구보관"}
        </button>
      )}
      {!admin && mineFirst && report.report_status === "RECEIVED" && (
        <button className="btn ghost" style={{ marginTop: 12 }} disabled={busy} onClick={cancel}>
          신고 취소
        </button>
      )}
    </Shell>
  );
}
