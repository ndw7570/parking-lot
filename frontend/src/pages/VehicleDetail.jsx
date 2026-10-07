import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Shell, AppBar, Loading, useToast, Empty } from "../components/ui";
import { IconCar, IconPhone } from "../components/Icons";
import { dongHoApi, unauthorizedApi, vehicleApi, visitantApi } from "../api/resources";
import { authApi, meIdentity, isAdminUser } from "../api/auth";
import { decideVerdict, formatDate, formatDateTime, normalizePlateNumber, visitExpiry, minutesUntil, formatRemaining, PARKING_TYPE, VERDICT } from "../lib/domain";

export default function VehicleDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [dongHo, setDongHo] = useState(null);
  const [visitant, setVisitant] = useState(null);
  const [unauthorizedRecord, setUnauthorizedRecord] = useState(null);
  const [ownerVehicleCount, setOwnerVehicleCount] = useState(0);
  const [me, setMe] = useState(null);

  useEffect(() => {
    authApi.me().catch(() => null).then(setMe);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [v, visitants, dongHos, unauthorized, allVehicles] = await Promise.all([
          vehicleApi.get(id),
          visitantApi.list().catch(() => []),
          dongHoApi.list().catch(() => []),
          unauthorizedApi.list().catch(() => []),
          vehicleApi.list().catch(() => []),
        ]);
        if (alive) {
          setVehicle(v);
          setVerdict(decideVerdict(v, visitants));
          // 초과 카운팅은 '지정주차'(소유+비방문+비무단) 차량만.
          setOwnerVehicleCount(
            v?.user
              ? (allVehicles || []).filter(
                  (x) =>
                    !x.is_deleted &&
                    String(x.user) === String(v.user) &&
                    decideVerdict(x, visitants).verdict === VERDICT.DESIGNATED
                ).length
              : 0
          );
          const matchedDongHo = v?.users?.dong_ho_id
            ? dongHos.find((d) => String(d.dong_ho_id) === String(v.users.dong_ho_id))
            : dongHos.find((d) => String(d.user) === String(v?.user));
          setDongHo(matchedDongHo || null);
          setVisitant(visitants.find((item) => String(item.vehicle) === String(v?.vehicle_id)) || null);
          setUnauthorizedRecord(
            unauthorized.find(
              (item) =>
                normalizePlateNumber(item.plate_number || "") ===
                normalizePlateNumber(v?.plate_number || "")
            ) || null
          );
        }
      } catch {
        if (alive) setVehicle(false);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  async function remove() {
    if (!confirm("이 차량을 삭제하시겠습니까?")) return;
    try {
      await vehicleApi.remove(id);
      toast("삭제되었습니다.");
      nav("/vehicles", { replace: true });
    } catch {
      toast("삭제에 실패했습니다.", "err");
    }
  }

  // 차주 지정 해제 = vehicle.user 를 null 로 + 무단주차로 전환.
  // (권한: 어드민 또는 차주 본인 = canUnassign) 차주가 없는 차량은 무단주차이므로
  // parking_type 태그도 함께 무단주차로 바꾼다.
  async function unassign() {
    if (!confirm("이 차량의 차주 지정을 해제할까요? 무단주차로 전환됩니다.")) return;
    try {
      await vehicleApi.patch(id, { user: null, parking_type: PARKING_TYPE.UNAUTHORIZED });
      const next = { ...vehicle, user: null, users: null, parking_type: PARKING_TYPE.UNAUTHORIZED };
      setVehicle(next);
      setVerdict(decideVerdict(next, [])); // 차주 없음 → 무단주차 판정
      setDongHo(null);
      toast("차주 지정을 해제했습니다. 무단주차로 전환됩니다.");
    } catch {
      toast("해제에 실패했습니다.", "err");
    }
  }

  if (loading)
    return (
      <Shell bar={<AppBar title="차량 정보" sub="Vehicle" back />} hideTabs>
        <Loading />
      </Shell>
    );

  if (!vehicle)
    return (
      <Shell bar={<AppBar title="차량 정보" sub="Vehicle" back />} hideTabs>
        <Empty icon={<IconCar width={26} height={26} />} title="차량을 찾을 수 없습니다" />
      </Shell>
    );

  const tone =
    verdict?.verdict === VERDICT.DESIGNATED
      ? "ok"
      : verdict?.verdict === VERDICT.VISITOR
      ? "warn"
      : "danger";
  const owner = vehicle.users || null;
  const isVisitor = vehicle.parking_type === PARKING_TYPE.VISITOR || verdict?.verdict === VERDICT.VISITOR;
  const isUnauthorized = vehicle.parking_type === PARKING_TYPE.UNAUTHORIZED || verdict?.verdict === VERDICT.UNAUTHORIZED;

  // 정책: 수정·삭제는 admin만. 차주 지정 해제는 admin 또는 차주 본인.
  const myId = meIdentity(me);
  const isAdmin = isAdminUser(me);
  const isOwner = !!(myId && myId === String(vehicle.user));
  const canEdit = isAdmin; // 수정: admin만 (본인 차량이라도 일반 유저 불가)
  const canDelete = isAdmin; // 삭제: admin만
  const canUnassign = isAdmin || isOwner; // 차주 지정 해제: admin 또는 차주 본인

  return (
    <Shell bar={<AppBar title="차량 정보" sub="Vehicle" back />} hideTabs>
      <div className={`verdict ${tone}`}>
        <div className="eyebrow">주차 판정</div>
        <div className="big">{verdict?.label}</div>
        <div className="sub">{verdict?.sub}</div>
        <div className="plate">
          <IconCar width={16} height={16} />
          {vehicle.plate_number || `#${vehicle.vehicle_id}`}
        </div>
      </div>

      {ownerVehicleCount >= 2 && verdict?.verdict === VERDICT.DESIGNATED && (
        <div style={{ marginTop: 10 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#b45309",
              background: "#fef3c7",
              borderRadius: 999,
              padding: "4px 10px",
            }}
          >
            초과({ownerVehicleCount})
          </span>
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <Line k="주차유형" v={vehicle.parking_type} />
        <Line k="차종" v={vehicle.vehicle_type} />
        <Line k="모델명" v={vehicle.model_name} />
        <Line k="색상" v={vehicle.color} />
        <Line k="타워 주차" v={vehicle.tower_yn ? "가능" : "불가"} />
        <Line k="비고" v={vehicle.remarks} />
        {owner && dongHo && (
          <>
            <Line k="예상 거주 시작일" v={dongHo.exp_resi_start_date ? formatDate(dongHo.exp_resi_start_date) : "-"} />
            <Line k="예상 거주 종료일" v={dongHo.exp_resi_end_date ? formatDate(dongHo.exp_resi_end_date) : "-"} />
          </>
        )}
        {(isVisitor || isUnauthorized) && (
          <>
            <Line k="주차 시작 시각" v={formatDateTime(visitant?.created_at || unauthorizedRecord?.parking_start_time)} />
            <Line k="주차 종료 시각" v={formatDateTime(unauthorizedRecord?.parking_end_time)} />
          </>
        )}
        {isVisitor && (
          <>
            <Line k="방문 유효시간" v={visitant?.valid_hours ? `${visitant.valid_hours}시간` : "-"} />
            <Line k="출차까지" v={formatRemaining(minutesUntil(visitExpiry(visitant)))} />
          </>
        )}
      </div>

      {owner && (
        <>
          <div className="section-title">거주민 정보</div>
          <div className="card">
            <Line k="이름" v={owner.user_name} />
            <Line k="연락처" v={owner.phone_number} />
          </div>
          {owner.phone_number && (
            <a
              className="btn signal"
              href={`tel:${owner.phone_number}`}
              style={{ marginTop: 12 }}
            >
              <IconPhone width={19} height={19} />
              거주민에게 전화
            </a>
          )}
          {canUnassign && (
            <button
              className="btn ghost"
              style={{ marginTop: 10 }}
              onClick={unassign}
            >
              차주 지정 해제
            </button>
          )}
        </>
      )}

      <div className="btn-row" style={{ marginTop: 12 }}>
        <button className="btn ghost" onClick={() => nav(-1)}>
          목록
        </button>
        {canEdit && (
          <button className="btn signal" onClick={() => nav(`/vehicles/${id}/edit`)}>
            수정
          </button>
        )}
        {canDelete && (
          <button className="btn danger" onClick={remove}>
            삭제
          </button>
        )}
      </div>
    </Shell>
  );
}

function Line({ k, v }) {
  return (
    <div className="detail-line">
      <span className="k">{k}</span>
      <span className="v">{v || "-"}</span>
    </div>
  );
}
