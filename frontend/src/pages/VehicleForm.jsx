import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Shell, AppBar, useToast } from "../components/ui";
import { Field, TextInput, TextArea, ChipPicker } from "../components/form";
import { IconCar, IconUsers } from "../components/Icons";
import {
  vehicleApi,
  visitantApi,
  userProfileApi,
} from "../api/resources";
import {
  PARKING_TYPE,
  VEHICLE_TYPE,
  COLORS,
  VISIT_DURATIONS,
  VERDICT,
  decideVerdict,
  formatPhoneNumber,
  normalizeId,
  normalizePlateNumber,
  visitExpiry,
  minutesUntil,
} from "../lib/domain";
import { getCurrentUserId, authApi, isAdminUser } from "../api/auth";

// Registration modes, driven by ?type=
const MODES = {
  resident: {
    title: "거주민 차량 등록",
    parking_type: PARKING_TYPE.RESIDENT,
    vehicle_type: VEHICLE_TYPE.SEDAN,
    needsOwner: true,
    isVisitor: false,
  },
  visitor: {
    title: "방문차량 등록",
    parking_type: PARKING_TYPE.VISITOR,
    vehicle_type: VEHICLE_TYPE.SEDAN,
    needsOwner: true,
    isVisitor: true,
  },
};

const MODE_OPTS = [
  { value: "resident", label: "거주민" },
  { value: "visitor", label: "방문" },
];

export default function VehicleForm() {
  const nav = useNavigate();
  const toast = useToast();
  const location = useLocation();
  const { id } = useParams();
  const [params] = useSearchParams();
  const isEdit = location.pathname.includes("/edit");
  const currentUserId = getCurrentUserId();

  const [mode, setMode] = useState(params.get("type") || "resident");
  const cfg = MODES[mode] || MODES.resident;

  const [owners, setOwners] = useState([]);
  const [existingVehicles, setExistingVehicles] = useState([]);
  // 소프트삭제(is_deleted=True) 차량 id 집합 — 카운트에서 제외.
  // (목록 응답이 is_deleted 를 안 줄 수 있어, 삭제 목록을 따로 받아 보강한다.)
  const [deletedVehicleIds, setDeletedVehicleIds] = useState(() => new Set());
  const [visitants, setVisitants] = useState([]);
  const [busy, setBusy] = useState(false);
  // Plate lookup (see onPlateApply). plate_number is unique → an existing match
  // is LOADED and UPDATED on save, never duplicated.
  const [loadPrompt, setLoadPrompt] = useState(null); // { vehicle, visitant } 기존 차량 불러오기 확인
  const [existingFound, setExistingFound] = useState(false); // 같은 번호의 기존 차량이 조회됨
  const [residentVisitBlocked, setResidentVisitBlocked] = useState(false); // 방문 등록인데 기존이 거주차량 → 불가
  const [visitorConvertUnauth, setVisitorConvertUnauth] = useState(false); // 방문 등록 + 기존 무단 → 일반유저도 전환 허용
  const [loadedVehicleId, setLoadedVehicleId] = useState(null); // 불러온 차량 id → 저장 시 이 차량 수정
  const [loadedVehicleDeleted, setLoadedVehicleDeleted] = useState(false); // 불러온 차량이 소프트삭제 상태였나
  const [plateApplied, setPlateApplied] = useState(false); // 차량번호 '적용'을 눌렀는가
  const [ownerLookedUp, setOwnerLookedUp] = useState(false); // 차주 아이디 '조회'를 했는가
  const [ownerLookup, setOwnerLookup] = useState(null); // 차주 아이디 조회 결과 (user_profile)
  // Edit-permission (admin or the vehicle's owner):
  const [currentUser, setCurrentUser] = useState(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [editLoaded, setEditLoaded] = useState(false);
  // 2-step flow: 1 = choose 거주민/방문, 2 = details.
  // 신규 등록에 ?type= 이 명시되면(예: 홈의 방문 등록) 선택을 건너뛰고 곧장 상세로.
  const [step, setStep] = useState(params.get("type") && !isEdit ? 2 : 1);

  const [form, setForm] = useState({
    // Empty by default; the effect below fills it with the logged-in id ONLY
    // when that id is an actual user_profile (else it stays null → no bad FK).
    user: "",
    plate_number: normalizePlateNumber(params.get("plate") || ""),
    vehicle_type: cfg.vehicle_type,
    model_name: "",
    color: "",
    tower_yn: false,
    remarks: "",
    // visitor extras
    visitant_name: "",
    phone_number: "",
    valid_hours: 6, // 방문 티켓 유효시간(6/12/24). 기본 6h.
  });

  // Switching 등록유형(거주민/방문)은 이미 입력한 차종 등 폼 값을 지우지 않는다.
  // (플레이트 매칭 결과만 초기화 — 유형에 따라 판정이 달라지므로.)
  useEffect(() => {
    setLoadPrompt(null);
  }, [mode]); // eslint-disable-line

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [ownerList, vehicleList, visitantList, deletedList] = await Promise.all([
          userProfileApi.list(),
          vehicleApi.list().catch(() => []),
          visitantApi.list().catch(() => []),
          vehicleApi.list({ soft_delete_mode: "deleted" }).catch(() => []),
        ]);
        if (alive) {
          setOwners(ownerList);
          setExistingVehicles(vehicleList || []);
          setVisitants(visitantList || []);
          setDeletedVehicleIds(
            new Set((deletedList || []).map((v) => String(v.vehicle_id)))
          );
        }
      } catch {
        if (alive) {
          setOwners([]);
          setExistingVehicles([]);
          setVisitants([]);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const onInput = (k) => (e) => set(k)(e.target.value);
  // Typing a new plate invalidates any prior match/load.
  const onPlateInput = (e) => {
    set("plate_number")(normalizePlateNumber(e.target.value));
    setLoadPrompt(null);
    setLoadedVehicleId(null);
    setLoadedVehicleDeleted(false);
    setExistingFound(false);
    setResidentVisitBlocked(false);
    setVisitorConvertUnauth(false);
    setPlateApplied(false); // 번호가 바뀌면 다시 '적용'해야 함
  };
  const onPhoneInput = (e) => set("phone_number")(formatPhoneNumber(e.target.value));

  const ownerNameOf = (userId) => {
    const o = owners.find((x) => String(x.user_id) === String(userId));
    return o?.user_name || userId || "거주민";
  };

  // 차주(거주민) 아이디 조회 → form.user 에 연결.
  const onOwnerIdInput = (e) => {
    set("user")(normalizeId(e.target.value));
    setOwnerLookup(null);
    setOwnerLookedUp(false); // 아이디가 바뀌면 다시 '조회'해야 함
  };
  async function lookupOwner() {
    const uid = String(form.user || "").trim();
    if (!uid) {
      toast(
        cfg.isVisitor
          ? "방문 대상 거주민 아이디를 입력해 주세요."
          : "차주 아이디를 입력해 주세요.",
        "err"
      );
      return;
    }
    try {
      const p = await userProfileApi.get(uid);
      setOwnerLookup(p);
      setOwnerLookedUp(true);
      toast(
        `${cfg.isVisitor ? "방문차량으로" : "차주로"} 연결했습니다: ${p.user_name || uid}`
      );
    } catch {
      setOwnerLookup(null);
      setOwnerLookedUp(false);
      toast("해당 아이디의 거주민을 찾을 수 없습니다.", "err");
    }
  }

  // Owner display + how many vehicles this owner already has (for the 2-car notice).
  const ownerInfo = useMemo(() => {
    const uid = String(form.user || "").trim();
    if (!uid) return null;
    if (ownerLookup && String(ownerLookup.user_id) === uid) return ownerLookup;
    return owners.find((o) => String(o.user_id) === uid) || null;
  }, [owners, ownerLookup, form.user]);

  // 이미 등록된 차량 수 안내 — 이 차주의 '지정주차' 차량만 카운팅(방문·무단 제외).
  // 지금 편집/불러오기 중인 차량 자신은 제외(그 외 이미 등록된 대수). 대소문자 무시.
  const ownerVehicleCount = useMemo(() => {
    const uid = normalizeId(form.user);
    if (!uid) return 0;
    const targetId = String(id ?? loadedVehicleId ?? "");
    return existingVehicles.filter(
      (v) =>
        normalizeId(v.user) === uid &&
        !v.is_deleted &&
        !deletedVehicleIds.has(String(v.vehicle_id)) &&
        String(v.vehicle_id) !== targetId &&
        decideVerdict(v, visitants).verdict === VERDICT.DESIGNATED
    ).length;
  }, [existingVehicles, deletedVehicleIds, visitants, form.user, id, loadedVehicleId]);

  // Load an existing vehicle into the form. Marks it for UPDATE on save so we
  // overwrite it (unique plate) instead of creating a duplicate.
  const applyVehicle = (match, linkedVisitant) => {
    setLoadedVehicleId(match.vehicle_id);
    setLoadedVehicleDeleted(Boolean(match.is_deleted));
    setPlateApplied(true);
    setOwnerLookedUp(Boolean(match.user)); // 기존 차량의 차주가 곧 연결됨
    setForm((f) => ({
      ...f,
      vehicle_type: match.vehicle_type || f.vehicle_type,
      model_name: match.model_name || f.model_name,
      color: match.color || f.color,
      tower_yn: Boolean(match.tower_yn),
      remarks: match.remarks || f.remarks,
      user: match.user || f.user,
      visitant_name: linkedVisitant?.visitant_name || f.visitant_name,
      phone_number: linkedVisitant?.phone_number || f.phone_number,
    }));
  };

  const onPlateApply = async () => {
    const next = normalizePlateNumber(form.plate_number);
    setLoadPrompt(null);
    setLoadedVehicleId(null);
    setLoadedVehicleDeleted(false);
    setExistingFound(false);
    setResidentVisitBlocked(false);
    setVisitorConvertUnauth(false);
    if (!next) {
      setPlateApplied(false);
      toast("차량번호를 입력해 주세요.", "err");
      return;
    }
    setPlateApplied(true); // '적용'을 눌러 확인함 (매칭/신규 무관)
    // Server-side exact match INCLUDING soft-deleted past records.
    // (Backend must allow `plate_number` as a search condition.)
    let matches = [];
    try {
      matches = await vehicleApi.list({ plate_number: next, soft_delete_mode: "all" });
    } catch {
      matches = existingVehicles;
    }
    const match =
      (matches || []).find(
        (v) => normalizePlateNumber(v.plate_number || "") === next
      ) || null;
    if (isEdit) {
      // 수정은 편집 중인 차량(id)에 고정.
      if (match && String(match.vehicle_id) === String(id)) {
        // 같은 차량 → 저장된 정보를 다시 불러오기 제안(편집 중 변경분 되돌리기).
        // 저장은 이 차량(id)만 갱신하므로 다른 차량 덮어쓰기 위험 없음.
        if (!meLoaded || isAdminUser(currentUser)) {
          const linkedVisitant =
            visitants.find((v) => String(v.vehicle) === String(match.vehicle_id)) || null;
          setLoadPrompt({ vehicle: match, visitant: linkedVisitant });
        }
      } else if (match) {
        // 다른 차량이 이미 쓰는 번호(번호는 유일) → 덮어쓰기 금지, 경고만.
        toast("이 번호는 다른 차량에 이미 등록되어 있습니다.", "err");
      }
      return;
    }
    if (!match) {
      toast("일치하는 기존 차량이 없습니다. 신규로 등록합니다.");
      return;
    }
    // Existing vehicle found (any type).
    const linkedVisitant =
      visitants.find((v) => String(v.vehicle) === String(match.vehicle_id)) || null;
    setExistingFound(true);
    // 방문 등록인데 기존 차량이 거주(지정) 차량이면 방문차량으로 등록 불가.
    if (
      cfg.isVisitor &&
      [PARKING_TYPE.RESIDENT, PARKING_TYPE.DESIGNATED].includes(match.parking_type)
    ) {
      setResidentVisitBlocked(true);
      toast("거주 차량은 방문차량으로 등록할 수 없습니다.", "err");
      return;
    }
    // 방문 등록 + 기존이 '무단주차'면 일반 사용자도 방문으로 전환 허용.
    const convertUnauth =
      cfg.isVisitor && match.parking_type === PARKING_TYPE.UNAUTHORIZED;
    if (convertUnauth) setVisitorConvertUnauth(true);
    // 기존 차량 불러오기: admin, 또는 (방문+무단 전환)일 때만 노출.
    // 그 외 비admin은 loadPrompt 없이 ADMIN 안내(needsAdmin)만 뜬다.
    if (!meLoaded || isAdminUser(currentUser) || convertUnauth) {
      setLoadPrompt({ vehicle: match, visitant: linkedVisitant });
    }
  };

  const acceptLoadPrompt = () => {
    if (!loadPrompt) return;
    applyVehicle(loadPrompt.vehicle, loadPrompt.visitant);
    setLoadPrompt(null);
    toast("기존 차량을 불러왔습니다. 저장하면 이 차량이 수정됩니다.");
  };

  const vehicleTypeOptions = useMemo(() => {
    return [
      VEHICLE_TYPE.SEDAN,
      VEHICLE_TYPE.SUV,
      VEHICLE_TYPE.VAN,
      VEHICLE_TYPE.MOTORCYCLE,
      VEHICLE_TYPE.ETC,
    ];
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    let alive = true;
    (async () => {
      try {
        const vehicle = await vehicleApi.get(id);
        const visitants = await visitantApi.list().catch(() => []);
        const visitant = visitants.find((item) => String(item.vehicle) === String(vehicle?.vehicle_id));
        if (alive) {
          setMode(vehicle?.parking_type === PARKING_TYPE.VISITOR || visitant ? "visitor" : "resident");
          setForm({
            user: vehicle?.user || "",
            plate_number: normalizePlateNumber(vehicle?.plate_number || ""),
            vehicle_type: vehicle?.vehicle_type || VEHICLE_TYPE.SEDAN,
            model_name: vehicle?.model_name || "",
            color: vehicle?.color || "",
            tower_yn: Boolean(vehicle?.tower_yn),
            remarks: vehicle?.remarks || "",
            visitant_name: visitant?.visitant_name || "",
            phone_number: visitant?.phone_number || "",
            valid_hours: Number(visitant?.valid_hours) || 6,
          });
          setPlateApplied(true);
          setOwnerLookedUp(Boolean(vehicle?.user));
          setEditLoaded(true);
        }
      } catch {
        if (alive) {
          toast("기존 차량 정보를 불러오지 못했습니다.", "err");
          setEditLoaded(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, isEdit]);

  useEffect(() => {
    // 어드민은 차주(아이디) 디폴트를 빈칸으로 둔다(본인 id 자동채움 금지).
    if (!meLoaded || isAdminUser(currentUser)) return;
    if (!currentUserId || form.user || !owners.length) return;
    const matched = owners.some((owner) => String(owner.user_id) === String(currentUserId));
    if (matched) setForm((f) => ({ ...f, user: currentUserId }));
  }, [owners, currentUserId, form.user, meLoaded, currentUser]);

  useEffect(() => {
    authApi
      .me()
      .catch(() => null)
      .then((me) => {
        setCurrentUser(me);
        setMeLoaded(true);
      });
  }, []);

  // 신규 등록은 누구나 가능. 그러나 '기존 차량 수정'(같은 번호 조회됨 or 편집 모드)은
  // admin만 가능하다 — 본인 차량이라도 일반 유저는 수정 불가(해제는 차량 상세에서).
  const isAdmin = isAdminUser(currentUser);
  const needsAdmin =
    meLoaded &&
    !isAdmin &&
    !visitorConvertUnauth && // 방문 등록에서 무단→방문 전환은 일반 사용자도 허용
    ((isEdit && editLoaded) || !!loadedVehicleId || existingFound);

  // 차량번호 '적용'은 항상 필수. 아이디 '조회'는 거주민 모드 + 방문 모드(어드민)일 때.
  // (방문차량을 어드민이 등록할 땐 호스트 거주민 아이디를 조회해 연결한다.)
  const showOwnerField = !cfg.isVisitor || isAdmin;
  const gateUnmet = !plateApplied || (showOwnerField && !ownerLookedUp);

  async function submit(e) {
    e.preventDefault();
    if (!form.plate_number.trim()) {
      toast("차량번호를 입력해 주세요.", "err");
      return;
    }
    if (needsAdmin) {
      toast("차량 정보 수정 권한이 없습니다. ADMIN에게 연락해 주세요.", "err");
      return;
    }
    if (residentVisitBlocked) {
      toast("거주 차량은 방문차량으로 등록할 수 없습니다.", "err");
      return;
    }
    if (!plateApplied) {
      toast("차량번호 옆 ‘적용’을 눌러 차량을 확인해 주세요.", "err");
      return;
    }
    if (showOwnerField && !ownerLookedUp) {
      toast(
        cfg.isVisitor
          ? "방문 대상 거주민 아이디 ‘조회’를 눌러 연결해 주세요."
          : "차주 아이디 ‘조회’를 눌러 차주를 연결해 주세요.",
        "err"
      );
      return;
    }
    // 방문 재등록 차단: 아직 출차 30분 전이 안 됐으면 다시 발급 불가.
    if (cfg.isVisitor) {
      const plate = normalizePlateNumber(form.plate_number);
      const veh = existingVehicles.find(
        (v) => normalizePlateNumber(v.plate_number || "") === plate
      );
      const active = veh
        ? visitants.find(
            (x) => String(x.vehicle) === String(veh.vehicle_id) && !x.is_deleted
          )
        : null;
      const remaining = active ? minutesUntil(visitExpiry(active)) : null;
      if (remaining != null && remaining > 30) {
        toast(
          `아직 출차 전입니다. 출차 30분 전부터 재등록할 수 있어요. (남은 시간 약 ${remaining}분)`,
          "err"
        );
        return;
      }
    }
    setBusy(true);
    try {
      // vehicle.user is a FK to user_profile (PK e.g. "801호") — NOT the auth
      // username. form.user is auto-set only when the logged-in id actually
      // matches a user_profile; otherwise send null (owner assigned later).
      const ownerId = form.user || null;
      // Matches the vehicle serializer contract (is_deleted is server-managed).
      const vehiclePayload = {
        user: ownerId,
        parking_type: cfg.parking_type,
        vehicle_type: form.vehicle_type,
        model_name: form.model_name || null,
        plate_number: normalizePlateNumber(form.plate_number),
        color: form.color || null,
        tower_yn: Boolean(form.tower_yn),
        attachment_file_id: null,
        remarks: form.remarks || null,
      };

      // plate_number is unique → editing / a loaded existing car UPDATES it
      // (overwrite owner·type·…); only a brand-new plate creates a row.
      let vehicle;
      if (loadedVehicleId) {
        // 불러온 기존 차량 재등록. 조회 때 소프트삭제였으면 먼저 복원한 뒤 수정.
        if (loadedVehicleDeleted) {
          await vehicleApi.restore(loadedVehicleId);
        }
        try {
          vehicle = await vehicleApi.patch(loadedVehicleId, vehiclePayload);
        } catch (err) {
          // 안전망: is_deleted 정보가 없었는데 삭제 상태여서 404면 복원 후 재시도.
          if (err.response?.status === 404) {
            await vehicleApi.restore(loadedVehicleId);
            vehicle = await vehicleApi.patch(loadedVehicleId, vehiclePayload);
          } else {
            throw err;
          }
        }
      } else if (isEdit && id) {
        vehicle = await vehicleApi.patch(id, vehiclePayload);
      } else {
        vehicle = await vehicleApi.create(vehiclePayload);
      }

      if (cfg.isVisitor) {
        if (!ownerId) {
          toast("방문차량은 로그인한 거주민 기준으로 연결됩니다.", "err");
          setBusy(false);
          return;
        }
        const visitants = await visitantApi.list().catch(() => []);
        const existingVisitant = visitants.find((item) => String(item.vehicle) === String(vehicle.vehicle_id));
        const visitantPayload = {
          user: ownerId,
          vehicle: vehicle.vehicle_id,
          visitant_name: form.visitant_name || null,
          phone_number: form.phone_number || null,
          remarks: form.remarks || null,
          valid_hours: Number(form.valid_hours) || 6, // 6/12/24h. start/end·알람은 백엔드가 계산.
          is_deleted: false,
        };
        if (existingVisitant) {
          await visitantApi.patch(existingVisitant.visitant_id, visitantPayload);
        } else {
          await visitantApi.create(visitantPayload);
        }
      } else {
        // 거주민(지정)으로 저장 → 방문 판정을 없애기 위해 기존 방문 기록을 제거한다.
        // (판정 태그는 user + visitant 로 결정되므로, 방문→지정 전환 시 필수)
        const visitants = await visitantApi.list().catch(() => []);
        const existingVisitant = visitants.find(
          (item) => String(item.vehicle) === String(vehicle.vehicle_id) && !item.is_deleted
        );
        if (existingVisitant) {
          await visitantApi.remove(existingVisitant.visitant_id).catch(() => {});
        }
      }

      toast(isEdit ? "수정되었습니다." : "등록되었습니다.");
      nav(`/vehicles/${vehicle.vehicle_id}`, { replace: true });
    } catch (err) {
      // 백엔드가 주는 메시지 우선(활성 방문권/유효시간 400 등).
      const data = err.response?.data;
      const backendMsg =
        (typeof data?.message === "string" && data.message) ||
        (typeof data?.detail === "string" && data.detail) ||
        (Array.isArray(data?.valid_hours) && data.valid_hours[0]);
      toast(
        backendMsg ||
          (data ? "저장 실패: 입력값을 확인해 주세요." : "네트워크 오류로 저장하지 못했습니다."),
        "err"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell bar={<AppBar title={isEdit ? (cfg.isVisitor ? "방문차량 수정" : "거주민 차량 수정") : step === 1 ? "차량 등록" : cfg.title} sub={isEdit ? "Edit" : "Register"} back />} hideTabs>
      <form onSubmit={submit}>
        {/* 1단계: 거주민/방문 유형 선택. (?type= 로 들어온 신규는 이미 2단계) */}
        {step === 1 ? (
          <div>
            <div className="section-title" style={{ marginTop: 4 }}>
              {isEdit ? "어떤 차량으로 수정할까요?" : "어떤 차량을 등록할까요?"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {MODE_OPTS.map((o) => {
                const active = mode === o.value;
                const Icon = o.value === "visitor" ? IconCar : IconUsers;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => !needsAdmin && setMode(o.value)}
                    disabled={needsAdmin}
                    style={{
                      padding: "28px 12px",
                      borderRadius: 16,
                      border: active ? "2px solid var(--cyan-deep)" : "1px solid var(--line-strong)",
                      background: active ? "var(--cyan-soft)" : "#fff",
                      color: active ? "var(--navy-900)" : "var(--text)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 10,
                      fontWeight: 800,
                      fontSize: 17,
                      cursor: needsAdmin ? "not-allowed" : "pointer",
                    }}
                  >
                    <Icon width={30} height={30} />
                    {o.label} 차량
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="btn primary"
              style={{ marginTop: 16 }}
              onClick={() => setStep(2)}
              disabled={needsAdmin}
            >
              다음
            </button>
          </div>
        ) : (
          <>
            {isEdit && (
              <div
                className="card"
                style={{ padding: 12, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span style={{ fontWeight: 700 }}>{cfg.isVisitor ? "방문 차량" : "거주민 차량"}</span>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ width: "auto", flexShrink: 0, padding: "7px 12px" }}
                  onClick={() => setStep(1)}
                >
                  유형 변경
                </button>
              </div>
            )}

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
              style={{
                flex: 1,
                minWidth: 0,
                ...(plateApplied
                  ? { borderColor: "var(--cyan-deep)", boxShadow: "0 0 0 1px var(--cyan-deep)" }
                  : {}),
              }}
            />
            <button
              type="button"
              className={`btn ${!plateApplied && form.plate_number.trim() ? "primary" : "ghost"}`}
              style={{
                width: "auto",
                flexShrink: 0,
                padding: "13px 18px",
                whiteSpace: "nowrap",
                ...(plateApplied ? { borderColor: "var(--cyan-deep)", color: "var(--cyan-deep)" } : {}),
              }}
              onClick={onPlateApply}
            >
              {plateApplied ? "✓ 적용" : "적용"}
            </button>
          </div>
          {form.plate_number.trim() && !plateApplied && (
            <div style={{ marginTop: 6, color: "var(--danger)", fontSize: 12.5, fontWeight: 600 }}>
              ‘적용’을 눌러 기존 차량 여부를 확인해야 등록할 수 있습니다.
            </div>
          )}
        </Field>

        {/* 같은 번호의 기존 차량이 조회됨(or 편집 모드) + 비admin → 수정 불가 안내 */}
        {needsAdmin && (
          <div
            className="card"
            style={{
              padding: 14,
              marginBottom: 12,
              background: "var(--danger-soft)",
              border: "1px solid var(--danger)",
              color: "var(--danger)",
            }}
          >
            <div style={{ fontWeight: 700 }}>이미 등록된 차량입니다.</div>
            <div style={{ fontWeight: 600, marginTop: 4, fontSize: 13 }}>
              차량 정보 수정은 ADMIN에게 연락해 주세요.
            </div>
          </div>
        )}

        {residentVisitBlocked && (
          <div
            className="card"
            style={{
              padding: 14,
              marginBottom: 12,
              background: "var(--danger-soft)",
              border: "1px solid var(--danger)",
              color: "var(--danger)",
            }}
          >
            <div style={{ fontWeight: 700 }}>거주 차량입니다.</div>
            <div style={{ fontWeight: 600, marginTop: 4, fontSize: 13 }}>
              이 차량은 방문차량으로 등록할 수 없습니다.
            </div>
          </div>
        )}

        {showOwnerField && (
          <Field
            label={cfg.isVisitor ? "방문 대상 거주민 (아이디)" : "차주 (아이디)"}
            hint={
              cfg.isVisitor
                ? "방문을 받는 거주민 아이디를 입력 후 조회해 연결합니다."
                : "거주민 아이디를 입력 후 조회하면 차주로 연결됩니다."
            }
          >
            <div className="row" style={{ gap: 8 }}>
              <TextInput
                placeholder="거주민 아이디"
                value={form.user}
                onChange={onOwnerIdInput}
                style={{
                  flex: 1,
                  minWidth: 0,
                  ...(ownerLookedUp
                    ? { borderColor: "var(--cyan-deep)", boxShadow: "0 0 0 1px var(--cyan-deep)" }
                    : {}),
                }}
              />
              <button
                type="button"
                className={`btn ${!ownerLookedUp && form.user.trim() ? "primary" : "ghost"}`}
                style={{
                  width: "auto",
                  flexShrink: 0,
                  padding: "13px 18px",
                  whiteSpace: "nowrap",
                  ...(ownerLookedUp ? { borderColor: "var(--cyan-deep)", color: "var(--cyan-deep)" } : {}),
                }}
                onClick={lookupOwner}
              >
                {ownerLookedUp ? "✓ 조회" : "조회"}
              </button>
            </div>
            {ownerInfo && ownerLookedUp && (
              <div className="muted" style={{ marginTop: 6, fontSize: 12.5 }}>
                {cfg.isVisitor ? "거주민" : "차주"} · {ownerInfo.user_name || ownerInfo.user_id} ({ownerInfo.user_id})
              </div>
            )}
            {form.user && !ownerLookedUp && (
              <div style={{ marginTop: 6, color: "var(--danger)", fontSize: 12.5, fontWeight: 600 }}>
                ‘조회’를 눌러 차주를 연결해야 등록할 수 있습니다.
              </div>
            )}
            {!cfg.isVisitor && form.user && ownerVehicleCount >= 1 && (
              <div
                className="card"
                style={{ padding: 12, marginTop: 8, border: "1px solid var(--danger)" }}
              >
                <div style={{ color: "var(--danger)", fontWeight: 600, fontSize: 13 }}>
                  이미 등록된 차량이 {ownerVehicleCount}대 있습니다. 세대당 1대 등록을 권장드리며,
                  2대 등록 시 주차 이용에 제한이 있을 수 있어요.
                </div>
              </div>
            )}
          </Field>
        )}

        {loadPrompt && !needsAdmin && (
          <div
            className="card"
            style={{ padding: 12, marginBottom: 12, border: "1px solid var(--cyan-deep)" }}
          >
            <div style={{ fontWeight: 700 }}>
              같은 번호의 기존 차량이 있습니다. 불러오시겠습니까?
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 12.5, display: "grid", gap: 3 }}>
              <span>
                {[loadPrompt.vehicle?.plate_number, loadPrompt.vehicle?.vehicle_type, loadPrompt.vehicle?.model_name]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <span>주차유형 · {loadPrompt.vehicle?.parking_type || "-"}</span>
              <span>차주 · {ownerNameOf(loadPrompt.vehicle?.user) || "미지정"}</span>
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              불러온 뒤 저장하면 새 차량이 아니라 <b>이 차량이 수정</b>됩니다.
            </div>
            <div className="btn-row" style={{ marginTop: 10 }}>
              <button type="button" className="btn ghost" onClick={() => setLoadPrompt(null)}>
                아니오
              </button>
              <button type="button" className="btn primary" onClick={acceptLoadPrompt}>
                예, 불러오기
              </button>
            </div>
          </div>
        )}

        <Field label="차종">
          <ChipPicker
            options={vehicleTypeOptions}
            value={form.vehicle_type}
            onChange={set("vehicle_type")}
          />
        </Field>

        <Field label="색상">
          <ChipPicker options={COLORS} value={form.color} onChange={set("color")} />
        </Field>

        <Field label="모델명 (선택)">
          <TextInput
            placeholder="예) 그랜저 IG"
            value={form.model_name}
            onChange={onInput("model_name")}
          />
        </Field>

        {cfg.isVisitor && (
          <>
            <Field label="방문 유효시간" hint="발급 시점부터 이 시간 동안 유효합니다. (출차 30/15/5분 전 알림)">
              <select
                className="input"
                value={form.valid_hours}
                onChange={(e) => set("valid_hours")(Number(e.target.value))}
              >
                {VISIT_DURATIONS.map((h) => (
                  <option key={h} value={h}>
                    {h}시간
                  </option>
                ))}
              </select>
            </Field>
            <Field label="방문자 이름">
              <TextInput
                placeholder="방문자 이름"
                value={form.visitant_name}
                onChange={onInput("visitant_name")}
              />
            </Field>
            <Field label="방문자 연락처">
              <TextInput
                placeholder="010-0000-0000"
                inputMode="tel"
                maxLength={13}
                value={form.phone_number}
                onChange={onPhoneInput}
              />
            </Field>
          </>
        )}

        <Field label="타워 주차">
          <div className="row">
            <button
              type="button"
              className={`chip ${form.tower_yn ? "on" : ""}`}
              onClick={() => set("tower_yn")(true)}
            >
              가능
            </button>
            <button
              type="button"
              className={`chip ${!form.tower_yn ? "on" : ""}`}
              onClick={() => set("tower_yn")(false)}
            >
              불가
            </button>
          </div>
        </Field>

        <Field label="비고 (선택)">
          <TextArea
            placeholder="특이사항"
            value={form.remarks}
            onChange={onInput("remarks")}
          />
        </Field>

            <button className="btn primary" disabled={busy || needsAdmin || gateUnmet || residentVisitBlocked} style={{ marginTop: 6 }}>
              {busy
                ? "저장 중…"
                : needsAdmin
                ? "ADMIN 문의 필요"
                : residentVisitBlocked
                ? "등록 불가 (거주 차량)"
                : !plateApplied
                ? "적용 후 등록"
                : gateUnmet
                ? "조회 후 등록"
                : loadedVehicleId && !isEdit
                ? "불러온 차량 수정"
                : isEdit
                ? "수정"
                : "등록"}
            </button>
          </>
        )}
      </form>
    </Shell>
  );
}
