import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconBell } from "./Icons";
import { authApi, meIdentity } from "../api/auth";
import { visitantApi, vehicleApi } from "../api/resources";
import { visitExpiry, minutesUntil, formatRemaining } from "../lib/domain";

// 내가 호스트인 방문차량 중 출차 임박(≤30분)한 것을 벨/목록으로 보여준다.
// 30초마다 남은시간을 다시 계산. (실제 30/15/5분 푸시 알림은 백엔드 몫)
const IMMINENT_MIN = 30; // 이 분 이하로 남으면 벨에 표시
const OVERDUE_FLOOR = -120; // 출차 2시간 초과 지난 건은 숨김

function toneOf(min) {
  if (min <= 5) return "var(--danger)";
  if (min <= 15) return "#b45309";
  return "var(--cyan-deep)";
}

export function NotificationBell() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer;
    (async () => {
      const me = await authApi.me().catch(() => null);
      const myId = meIdentity(me);
      if (!alive) return;
      if (!myId) {
        setItems([]);
        return;
      }
      async function load() {
        try {
          const [visitants, vehicles] = await Promise.all([
            visitantApi.list().catch(() => []),
            vehicleApi.list().catch(() => []),
          ]);
          const vmap = {};
          (vehicles || []).forEach((v) => (vmap[String(v.vehicle_id)] = v));
          const mine = (visitants || [])
            .filter((v) => !v.is_deleted && String(v.user) === String(myId))
            .map((v) => {
              const remaining = minutesUntil(visitExpiry(v));
              const veh = vmap[String(v.vehicle)];
              return {
                id: v.visitant_id,
                vehicleId: v.vehicle,
                plate: veh?.plate_number || `#${v.vehicle}`,
                name: v.visitant_name || "",
                remaining,
              };
            })
            .filter(
              (x) =>
                x.remaining != null &&
                x.remaining <= IMMINENT_MIN &&
                x.remaining > OVERDUE_FLOOR
            )
            .sort((a, b) => a.remaining - b.remaining);
          if (alive) setItems(mine);
        } catch {
          if (alive) setItems([]);
        }
      }
      await load();
      timer = setInterval(load, 30000);
    })();
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  const count = items.length;

  return (
    <div style={{ position: "relative" }}>
      <button className="icon-btn" aria-label="알림" onClick={() => setOpen((o) => !o)}>
        <IconBell width={20} height={20} />
        {count > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: 999,
              background: "var(--danger)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* click-away */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              width: 280,
              maxWidth: "80vw",
              background: "var(--surface, #fff)",
              border: "1px solid var(--line-strong)",
              borderRadius: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
              zIndex: 50,
              padding: 8,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
                padding: "6px 8px",
                color: "var(--text)",
              }}
            >
              방문차량 출차 임박
            </div>
            {items.length === 0 ? (
              <div style={{ padding: "10px 8px", fontSize: 13, color: "var(--text-faint)" }}>
                임박한 방문차량이 없습니다.
              </div>
            ) : (
              items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    nav(`/vehicles/${it.vehicleId}`);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: 0,
                    padding: "8px 8px",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                    {it.plate}
                    {it.name ? ` · ${it.name}` : ""}
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: toneOf(it.remaining),
                      marginTop: 2,
                    }}
                  >
                    {formatRemaining(it.remaining)}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
