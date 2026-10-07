import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Shell, AppBar, useToast } from "../components/ui";
import { Field, TextInput, TextArea, Segment } from "../components/form";
import { userProfileApi, dongHoApi } from "../api/resources";
import { authApi, meIdentity, isAdminUser } from "../api/auth";
import { formatPhoneNumber, buildUnitNames, normalizeId } from "../lib/domain";

function normalizeHoNumber(value = "") {
  const digits = String(value).replace(/\D/g, "").slice(0, 4);
  return digits ? `${digits}호` : "";
}

const TERMS = [
  { value: "resident", label: "거주 등록" },
  { value: "temp", label: "임시 거주" },
];

// Sentinel dropdown value for "assign a unit later" (registers with no 호수).
const LATER = "__later__";

export default function ResidentForm() {
  const nav = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [term, setTerm] = useState("resident");
  const [busy, setBusy] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [allHomes, setAllHomes] = useState([]);
  const [profileFound, setProfileFound] = useState(null); // null=아직조회, true/false

  const [form, setForm] = useState({
    user_id: "",
    user_name: "",
    phone_number: "",
    dong_ho_name: "",
    exp_resi_start_date: "",
    exp_resi_end_date: "",
    temp_resi_start_date: "",
    temp_resi_end_date: "",
    remarks: "",
  });

  useEffect(() => {
    if (!isEdit) return;
    let alive = true;
    (async () => {
      try {
        const home = await dongHoApi.get(id);
        const profile = home?.user ? await userProfileApi.get(home.user).catch(() => null) : null;
        if (alive) {
          setTerm(home?.temp_resi_start_date || home?.temp_resi_end_date ? "temp" : "resident");
          setForm({
            user_id: profile?.user_id || home?.user || "",
            user_name: profile?.user_name || "",
            phone_number: profile?.phone_number || "",
            dong_ho_name: normalizeHoNumber(home?.dong_ho_name || ""),
            exp_resi_start_date: home?.exp_resi_start_date || "",
            exp_resi_end_date: home?.exp_resi_end_date || "",
            temp_resi_start_date: home?.temp_resi_start_date || "",
            temp_resi_end_date: home?.temp_resi_end_date || "",
            remarks: home?.remarks || "",
          });
        }
      } catch {
        if (alive) toast("기존 거주민 정보를 불러오지 못했습니다.", "err");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, isEdit]);

  useEffect(() => {
    authApi
      .me()
      .catch(() => null)
      .then((me) => {
        setCurrentUser(me);
        setMeLoaded(true);
      });
  }, []);

  // Editing a profile is limited to that resident or an admin. Registration is open.
  const myId = meIdentity(currentUser);
  const canEdit =
    !isEdit ||
    isAdminUser(currentUser) ||
    (myId && myId === String(form.user_id));

  // Only treat as denied once we actually know who the user is and whose record this is.
  const denied = isEdit && meLoaded && Boolean(form.user_id) && !canEdit;

  // Initial registration: offer only units not yet assigned to a resident.
  useEffect(() => {
    if (isEdit) return;
    dongHoApi
      .list()
      .catch(() => [])
      .then((list) => setAllHomes(list || []));
  }, [isEdit]);

  const availableUnits = useMemo(() => {
    const assigned = new Set(
      (allHomes || [])
        .filter((h) => h.user)
        .map((h) => normalizeHoNumber(h.dong_ho_name || ""))
        .filter(Boolean)
    );
    return buildUnitNames().filter((u) => !assigned.has(u));
  }, [allHomes]);

  const onInput = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const onUserIdInput = (e) => {
    setForm((f) => ({ ...f, user_id: normalizeId(e.target.value) }));
    setProfileFound(null);
  };
  // Look up the account (아이디) and auto-fill 이름/연락처.
  async function lookupProfile() {
    const uid = form.user_id.trim();
    if (!uid) {
      toast("아이디를 입력해 주세요.", "err");
      return;
    }
    try {
      const p = await userProfileApi.get(uid);
      setForm((f) => ({
        ...f,
        user_name: p.user_name || f.user_name,
        phone_number: p.phone_number || f.phone_number,
      }));
      setProfileFound(true);
      toast("가입 정보를 불러왔습니다.");
    } catch {
      setProfileFound(false);
      toast("해당 아이디의 가입 정보가 없습니다. 이름을 입력하면 새로 등록됩니다.", "err");
    }
  }
  const onHoInput = (e) =>
    setForm((f) => ({ ...f, dong_ho_name: normalizeHoNumber(e.target.value) }));
  const onPhoneInput = (e) =>
    setForm((f) => ({ ...f, phone_number: formatPhoneNumber(e.target.value) }));

  async function submit(e) {
    e.preventDefault();
    if (denied) {
      toast("수정 권한이 없습니다. 본인 또는 관리자만 수정할 수 있습니다.", "err");
      return;
    }
    // Create mode: the "나중에 지정" option (sentinel) registers with no unit.
    const assignLater = !isEdit && form.dong_ho_name === LATER;
    if (!isEdit && !form.user_id.trim()) {
      toast("아이디를 입력해 주세요.", "err");
      return;
    }
    if (!isEdit && profileFound === null) {
      toast("아이디 ‘조회’를 눌러 가입 정보를 확인해 주세요.", "err");
      return;
    }
    if (!form.user_name.trim()) {
      toast("이름은 필수입니다.", "err");
      return;
    }
    if (!isEdit && form.dong_ho_name === "") {
      toast("호수를 선택하거나 '나중에 지정'을 선택해 주세요.", "err");
      return;
    }
    const hoNumber = assignLater ? "" : normalizeHoNumber(form.dong_ho_name);
    if (!assignLater) {
      if (!hoNumber) {
        toast("호수를 선택해 주세요.", "err");
        return;
      }
      if (!/^\d{3,4}호$/.test(hoNumber)) {
        toast("호수는 3~4자리 숫자만 입력해 주세요. (예: 801호, 1301호)", "err");
        return;
      }
    }
    setBusy(true);
    try {
      const userId = form.user_id.trim() || hoNumber || `u${Date.now()}`;

      const profilePayload = {
        user_name: form.user_name.trim(),
        phone_number: form.phone_number.trim(),
      };

      if (isEdit) {
        await userProfileApi.patch(userId, profilePayload);
        const dongHoPayload = {
          dong_ho_name: hoNumber,
          user: userId,
          admin_check: false,
          remarks: form.remarks || null,
        };
        if (term === "temp") {
          dongHoPayload.temp_resi_start_date = form.temp_resi_start_date || null;
          dongHoPayload.temp_resi_end_date = form.temp_resi_end_date || null;
          dongHoPayload.exp_resi_start_date = null;
          dongHoPayload.exp_resi_end_date = null;
        } else {
          dongHoPayload.exp_resi_start_date = form.exp_resi_start_date || null;
          dongHoPayload.exp_resi_end_date = form.exp_resi_end_date || null;
          dongHoPayload.temp_resi_start_date = null;
          dongHoPayload.temp_resi_end_date = null;
        }
        await dongHoApi.patch(id, dongHoPayload);
        toast("수정되었습니다.");
      } else {
        // Profile is usually created at signup — patch if it exists, else create.
        if (profileFound) {
          await userProfileApi.patch(userId, profilePayload).catch(() => {});
        } else {
          try {
            await userProfileApi.create({ user_id: userId, ...profilePayload });
          } catch {
            await userProfileApi.patch(userId, profilePayload).catch(() => {});
          }
        }
        if (assignLater) {
          // No unit yet — the resident can be linked to a 호수 later.
          toast("거주민을 등록했습니다. 호수는 거주민 연결에서 나중에 지정할 수 있습니다.");
        } else {
          const dongHoPayload = {
            dong_ho_name: hoNumber,
            user: userId,
            admin_check: false,
            remarks: form.remarks || null,
          };
          if (term === "temp") {
            dongHoPayload.temp_resi_start_date = form.temp_resi_start_date || null;
            dongHoPayload.temp_resi_end_date = form.temp_resi_end_date || null;
          } else {
            dongHoPayload.exp_resi_start_date = form.exp_resi_start_date || null;
            dongHoPayload.exp_resi_end_date = form.exp_resi_end_date || null;
          }
          // If the unit already exists (a seeded 빈집), update it instead of
          // creating a duplicate row; otherwise create the new unit.
          const existingHome = (allHomes || []).find(
            (h) => normalizeHoNumber(h.dong_ho_name || "") === hoNumber
          );
          if (existingHome) {
            await dongHoApi.patch(existingHome.dong_ho_id, dongHoPayload);
          } else {
            await dongHoApi.create(dongHoPayload);
          }
          toast("등록되었습니다.");
        }
      }

      nav("/residents", { replace: true });
    } catch (err) {
      toast(
        err.response?.status === 400
          ? "저장 실패: 이미 등록된 세대이거나 입력값 오류입니다."
          : "네트워크 오류로 저장하지 못했습니다.",
        "err"
      );
    } finally {
      setBusy(false);
    }
  }

  const isTemp = term === "temp";

  return (
    <Shell
      bar={<AppBar title={isEdit ? "거주민 수정" : "거주민 등록"} sub={isEdit ? "Edit" : "Register"} back />}
      hideTabs
    >
      <form onSubmit={submit}>
        {denied && (
          <div
            className="card"
            style={{
              padding: 12,
              marginBottom: 12,
              background: "var(--danger-soft)",
              border: 0,
              color: "var(--danger)",
              fontWeight: 600,
            }}
          >
            이 거주민 정보를 수정할 권한이 없습니다. 본인 또는 관리자만 수정할 수 있습니다.
          </div>
        )}
        <Field label="거주 유형">
          <Segment options={TERMS} value={term} onChange={setTerm} />
        </Field>

        {isEdit ? (
          <Field label="호수" hint="예) 801호, 1301호">
            <TextInput
              placeholder="801호"
              value={form.dong_ho_name}
              onChange={onHoInput}
              inputMode="numeric"
              maxLength={4}
              autoFocus
            />
          </Field>
        ) : (
          <Field label="호수" hint="배정되지 않은 세대만 선택할 수 있습니다.">
            <select
              className="input"
              value={form.dong_ho_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, dong_ho_name: e.target.value }))
              }
            >
              <option value="">호수 선택</option>
              <option value={LATER}>나중에 지정</option>
              {availableUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field
          label="아이디"
          hint={isEdit ? undefined : "가입한 아이디 입력 후 조회하면 이름·연락처가 채워집니다."}
        >
          {isEdit ? (
            <TextInput value={form.user_id} disabled />
          ) : (
            <>
              <div className="row" style={{ gap: 8 }}>
                <TextInput
                  placeholder="아이디"
                  value={form.user_id}
                  onChange={onUserIdInput}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button
                  type="button"
                  className="btn ghost"
                  style={{ width: "auto", flexShrink: 0, padding: "13px 18px", whiteSpace: "nowrap" }}
                  onClick={lookupProfile}
                >
                  조회
                </button>
              </div>
              {form.user_id.trim() && profileFound === null && (
                <div style={{ marginTop: 6, color: "var(--danger)", fontSize: 12.5, fontWeight: 600 }}>
                  ‘조회’를 눌러 가입 정보를 확인해야 등록할 수 있습니다.
                </div>
              )}
            </>
          )}
        </Field>

        <Field label="이름">
          <TextInput
            placeholder="거주민 이름"
            value={form.user_name}
            onChange={onInput("user_name")}
          />
        </Field>

        <Field label="연락처">
          <TextInput
            placeholder="010-0000-0000"
            inputMode="tel"
            maxLength={13}
            value={form.phone_number}
            onChange={onPhoneInput}
          />
        </Field>

        {isTemp ? (
          <>
            <Field label="임시거주 시작일">
              <TextInput
                type="date"
                value={form.temp_resi_start_date}
                onChange={onInput("temp_resi_start_date")}
              />
            </Field>
            <Field
              label="임시거주 종료일"
              hint="종료일이 지나면 자동으로 빈집으로 표시됩니다."
            >
              <TextInput
                type="date"
                value={form.temp_resi_end_date}
                onChange={onInput("temp_resi_end_date")}
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="예상 거주 시작일">
              <TextInput
                type="date"
                value={form.exp_resi_start_date}
                onChange={onInput("exp_resi_start_date")}
              />
            </Field>
            <Field
              label="예상 거주 종료일"
              hint="1년 이상이면 장기 거주로 분류됩니다."
            >
              <TextInput
                type="date"
                value={form.exp_resi_end_date}
                onChange={onInput("exp_resi_end_date")}
              />
            </Field>
          </>
        )}

        <Field label="비고 (선택)">
          <TextArea
            placeholder="특이사항"
            value={form.remarks}
            onChange={onInput("remarks")}
          />
        </Field>

        <button
          className="btn primary"
          disabled={busy || denied || (!isEdit && profileFound === null)}
          style={{ marginTop: 6 }}
        >
          {busy
            ? "저장 중…"
            : denied
            ? "수정 불가"
            : !isEdit && profileFound === null
            ? "조회 후 등록"
            : isEdit
            ? "수정"
            : "등록"}
        </button>
      </form>
    </Shell>
  );
}
