import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Shell, AppBar, Loading, Empty, useToast } from "../components/ui";
import { Field, TextInput } from "../components/form";
import { IconHome, IconSearch, IconPhone, IconUsers } from "../components/Icons";
import { authApi, meIdentity, isAdminUser } from "../api/auth";
import { dongHoApi, userProfileApi } from "../api/resources";

export default function ResidentLinkPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [dongHo, setDongHo] = useState(null);
  const [users, setUsers] = useState([]);
  const [dongHos, setDongHos] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [home, userList, allHomes] = await Promise.all([
          dongHoApi.get(id),
          userProfileApi.list().catch(() => []),
          dongHoApi.list().catch(() => []),
        ]);
        if (alive) {
          setDongHo(home);
          setUsers(userList);
          setDongHos(allHomes);
          setSelectedUserId(home?.user || "");
        }
      } catch {
        if (alive) {
          setDongHo(false);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    authApi.me().catch(() => null).then((me) => setCurrentUser(me));
  }, []);

  const isSuperAdmin = isAdminUser(currentUser);
  const myId = meIdentity(currentUser);

  const currentOwner = useMemo(() => {
    if (!dongHo?.user) return null;
    return users.find((u) => String(u.user_id) === String(dongHo.user)) || null;
  }, [dongHo, users]);

  const selectedOwner = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find((u) => String(u.user_id) === String(selectedUserId)) || null;
  }, [selectedUserId, users]);

  const displayOwner = selectedOwner || currentOwner;

  const userAssignments = useMemo(() => {
    const map = {};
    dongHos.forEach((home) => {
      if (home.user) map[home.user] = home;
    });
    return map;
  }, [dongHos]);

  // Only the resident themselves or an admin may edit a profile.
  const canEditUser = (user) =>
    isSuperAdmin || (myId && myId === String(user.user_id));

  function onEditUser(user) {
    if (!canEditUser(user)) {
      toast("수정 권한이 없습니다. 본인 또는 관리자만 수정할 수 있습니다.", "err");
      return;
    }
    const home = userAssignments[user.user_id];
    if (!home) {
      toast("아직 세대에 연결되지 않아 호수가 없습니다. 먼저 현재 거주민으로 저장한 뒤 수정하세요.", "err");
      return;
    }
    // Reuse the resident register form in edit mode (loads all info incl. 호수).
    nav(`/residents/${home.dong_ho_id}/edit`);
  }

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    // Default (no search): only people not linked to another home —
    // unlinked users plus this home's current owner. Searching reaches everyone.
    if (!needle) {
      return users.filter((u) => {
        const assigned = userAssignments[u.user_id];
        return !assigned || String(assigned.dong_ho_id) === String(id);
      });
    }
    return users.filter((u) => {
      const haystack = [
        u.user_name,
        u.user_id,
        u.phone_number,
        u.address,
        u.address_detail,
        u.home_address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [users, search, userAssignments, id]);

  async function save(nextSelectedUserId = selectedUserId) {
    if (!isSuperAdmin && (!myId || myId !== String(dongHo?.user))) {
      toast("슈퍼어드민 또는 해당 세대의 현재 거주민만 수정할 수 있습니다.", "err");
      return;
    }

    if (nextSelectedUserId) {
      const otherHome = userAssignments[nextSelectedUserId];
      if (otherHome && String(otherHome.dong_ho_id) !== String(id)) {
        toast("이미 다른 세대에 연결된 거주민은 선택할 수 없습니다.", "err");
        return;
      }
    }

    setSaving(true);
    try {
      await dongHoApi.patch(id, { user: nextSelectedUserId || null });
      toast(nextSelectedUserId ? "현재 거주민을 반영했습니다." : "빈집으로 전환했습니다.");
      nav("/residents", { replace: true });
    } catch (err) {
      const data = err.response?.data;
      const detail =
        data?.user?.[0] ||
        data?.detail ||
        (typeof data === "string" ? data.slice(0, 140) : "");
      // Surface the real cause so failures are diagnosable (id/status/code/response).
      console.error("dong-ho save failed", {
        id,
        status: err.response?.status,
        code: err.code,
        message: err.message,
        data,
        err,
      });
      const label = err.response?.status ?? err.code ?? err.message ?? "네트워크";
      toast(`저장 실패 (${label})${detail ? " · " + detail : ""}`, "err");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Shell bar={<AppBar title="현재 거주민 선택" sub="Resident" back />} hideTabs>
        <Loading />
      </Shell>
    );
  }

  if (!dongHo) {
    return (
      <Shell bar={<AppBar title="현재 거주민 선택" sub="Resident" back />} hideTabs>
        <Empty icon={<IconHome width={26} height={26} />} title="세대를 찾을 수 없습니다" />
      </Shell>
    );
  }

  return (
    <Shell bar={<AppBar title="현재 거주민 선택" sub="Resident" back />} hideTabs>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span className="avatar" style={{ background: "var(--navy-700)" }}>
            <IconHome width={18} height={18} />
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {dongHo.dong_ho_name || `세대 #${dongHo.dong_ho_id}`}
            </div>
            <div className="muted" style={{ fontSize: 12.5 }}>
              현재 거주민을 한 명만 선택합니다.
            </div>
          </div>
        </div>

        <Field label="현재 거주민">
          <TextInput
            value={displayOwner?.user_name || displayOwner?.user_id || "미등록"}
            disabled
          />
        </Field>

        <Field label="거주민 검색" hint="이름, 사용자 ID, 연락처, 주소로 검색할 수 있습니다.">
          <div className="searchbar">
            <IconSearch width={18} height={18} color="var(--text-faint)" />
            <input
              placeholder="거주민 찾기"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Field>

        <div className="stack" style={{ marginTop: 6 }}>
          {filteredUsers.length === 0 ? (
            <div className="muted">
              {search.trim()
                ? "검색 결과가 없습니다."
                : "연결 가능한 거주민이 없습니다. 이름·ID로 검색해 보세요."}
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isCurrent = String(user.user_id) === String(dongHo.user);
              const isAssignedElsewhere = Boolean(
                userAssignments[user.user_id] &&
                  String(userAssignments[user.user_id].dong_ho_id) !== String(id)
              );
              const selected = String(selectedUserId) === String(user.user_id);
              const canSelect = !(isAssignedElsewhere && !isCurrent);
              return (
                <div
                  key={user.user_id}
                  className="card"
                  style={{
                    padding: 12,
                    border: selected ? "1px solid var(--cyan-deep)" : "1px solid var(--border)",
                    opacity: canSelect ? 1 : 0.65,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                    <button
                      type="button"
                      onClick={() => canSelect && setSelectedUserId(user.user_id)}
                      disabled={!canSelect}
                      style={{
                        flex: 1,
                        textAlign: "left",
                        background: "none",
                        border: 0,
                        padding: 0,
                        cursor: canSelect ? "pointer" : "not-allowed",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{user.user_name || user.user_id}</div>
                      <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                        {user.user_id}
                      </div>
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {selected && <span className="badge ok">선택됨</span>}
                      <button
                        type="button"
                        className="btn ghost"
                        style={{ padding: "5px 10px", fontSize: 12.5 }}
                        onClick={() => onEditUser(user)}
                      >
                        수정
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                    {user.phone_number && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <IconPhone width={15} height={15} color="var(--cyan-deep)" />
                        <span>{user.phone_number}</span>
                      </div>
                    )}
                    {(user.address || user.address_detail || user.home_address) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <IconUsers width={15} height={15} color="var(--cyan-deep)" />
                        <span>{user.address || user.address_detail || user.home_address}</span>
                      </div>
                    )}
                    {isAssignedElsewhere && !isCurrent && (
                      <div className="muted" style={{ fontSize: 12.5 }}>
                        이미 다른 세대에 연결된 거주민입니다.
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="btn-row" style={{ marginTop: 12 }}>
        <button className="btn ghost" onClick={() => nav("/residents")}>취소</button>
        <button className="btn danger" onClick={() => { setSelectedUserId(""); save(""); }} disabled={saving}>
          {saving ? "저장 중…" : "빈집으로 전환"}
        </button>
        <button className="btn primary" onClick={() => save()} disabled={saving}>
          {saving ? "저장 중…" : "현재 거주민 저장"}
        </button>
      </div>
    </Shell>
  );
}
