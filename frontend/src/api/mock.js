// ---------------------------------------------------------------------------
// Mock backend — in-memory data store used when VITE_MOCK is on.
// Field names mirror the Django models/serializers exactly so that turning the
// mock OFF (VITE_MOCK=0) swaps to the real API with zero component changes.
//
// Data persists to localStorage so refresh/registration survives a reload.
// ---------------------------------------------------------------------------

import { buildSeed } from "./mockData";

// All demo data lives in ONE place — see mockData.js. seed() just derives the
// relational tables from it. Bump LS_KEY whenever that data shape changes so
// stale localStorage is replaced with the fresh, consistent dataset.
const LS_KEY = "pk_mock_db_v4";

const seed = buildSeed;

// Separate id/password store for the demo auth flow (register / change password).
const ACCOUNTS_KEY = "pk_mock_accounts";
function loadAccounts() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}") || {};
  } catch {
    return {};
  }
}
function saveAccounts(accounts) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    /* ignore */
  }
}

// primary-key field name per resource path
const PK = {
  vehicle: "vehicle_id",
  "user-profile": "user_id",
  "dong-ho": "dong_ho_id",
  visitant: "visitant_id",
  "attachment-file": "attachment_file_id",
  "unauthorized-parking-record": "vehicle_id",
  post: "posts_id",
  comment: "comments_id",
  "post-like": "posts_like_id",
  "comment-like": "comments_like_id",
};

// path -> internal table key
const TABLE = {
  vehicle: "vehicle",
  "user-profile": "user_profile",
  "dong-ho": "dong_ho",
  visitant: "visitant",
  "attachment-file": "attachment_file",
  "unauthorized-parking-record": "unauthorized_parking_record",
  post: "post",
  comment: "comment",
  "post-like": "post_like",
  "comment-like": "comment_like",
};

// NOTE: keep this block free of forward references to `save`/`db` during
// initialization — a top-level `let db = load()` that calls `save()` (which
// assigns `db`) trips a temporal-dead-zone error once the bundle is minified.
let db;

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  } catch {
    /* ignore */
  }
}

function load() {
  let data = null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) data = JSON.parse(raw);
  } catch {
    data = null;
  }
  if (!data) {
    data = seed();
    db = data;
    persist();
  } else {
    db = data;
  }
  return db;
}

function save(next) {
  db = next;
  persist();
}

// initialize
db = load();

function nextId(tableKey, pk) {
  const rows = db[tableKey] || [];
  const nums = rows
    .map((r) => Number(r[pk]))
    .filter((n) => !Number.isNaN(n));
  // string PKs (user_id) won't produce numbers → caller supplies its own id
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms));

// Detail serializers embed related objects. Reproduce the important ones.
function decorate(path, row) {
  if (!row) return row;
  const r = { ...row };
  if (path === "vehicle" || path === "dong-ho" || path === "visitant") {
    const owner = (db.user_profile || []).find((u) => u.user_id === r.user);
    if (owner) r.users = { ...owner };
  }
  if (path === "visitant") {
    const v = (db.vehicle || []).find((x) => x.vehicle_id === r.vehicle);
    if (v) r.vehicles = { ...v };
  }
  return r;
}

// ---------------------------------------------------------------------------
// Public mock API — mirrors the shape used by resources.js / auth.js
// ---------------------------------------------------------------------------
export const mockApi = {
  async list(path, params = {}) {
    await delay();
    const key = TABLE[path];
    // soft_delete_mode=all → include soft-deleted rows (default: active only)
    // soft_delete_mode: all=전체, deleted=삭제만, 그 외(기본)=활성만
    const mode = params.soft_delete_mode;
    let rows = (db[key] || []).filter((r) => {
      if (mode === "all") return true;
      if (mode === "deleted") return Boolean(r.is_deleted);
      return !r.is_deleted;
    });
    // Control params aren't row fields — don't filter by them.
    const CONTROL = new Set(["soft_delete_mode", "page_size", "page", "ordering", "search"]);
    // light server-style filtering for the fields the UI passes
    Object.entries(params || {}).forEach(([k, val]) => {
      if (CONTROL.has(k) || val == null || val === "") return;
      // `field!=value` (not-equal) — sent as key "field!"
      if (k.endsWith("!")) {
        const field = k.slice(0, -1);
        rows = rows.filter((r) => String(r[field] ?? "") !== String(val));
        return;
      }
      rows = rows.filter((r) =>
        String(r[k] ?? "")
          .replace(/\s/g, "")
          .includes(String(val).replace(/\s/g, ""))
      );
    });
    return rows.map((r) => ({ ...r }));
  },

  async get(path, id) {
    await delay();
    const key = TABLE[path];
    const pk = PK[path];
    const row = (db[key] || []).find(
      (r) => String(r[pk]) === String(id) && !r.is_deleted
    );
    if (!row) {
      const err = new Error("Not found");
      err.response = { status: 404 };
      throw err;
    }
    return decorate(path, row);
  },

  async create(path, payload) {
    await delay();
    const key = TABLE[path];
    const pk = PK[path];
    const row = { ...payload };
    if (row[pk] == null || row[pk] === "") row[pk] = nextId(key, pk);
    if (!("is_deleted" in row)) row.is_deleted = false;
    if (!("created_at" in row) && ["post", "comment", "visitant"].includes(path))
      row.created_at = new Date().toISOString();
    // 방문권: 백엔드처럼 start=now, end=now+valid_hours 를 서버가 계산해 채운다.
    if (path === "visitant" && row.valid_hours) {
      const start = new Date();
      row.parking_start_time = start.toISOString();
      row.parking_end_time = new Date(
        start.getTime() + Number(row.valid_hours) * 3600 * 1000
      ).toISOString();
    }
    db[key] = [...(db[key] || []), row];
    // keep denormalized counters plausible
    if (path === "comment" && row.post != null) {
      const p = (db.post || []).find((x) => x.posts_id === Number(row.post));
      if (p) p.comment_count = (p.comment_count || 0) + 1;
    }
    save(db);
    return decorate(path, row);
  },

  async update(path, id, payload) {
    return this._patch(path, id, payload);
  },
  async patch(path, id, payload) {
    return this._patch(path, id, payload);
  },
  async _patch(path, id, payload) {
    await delay();
    const key = TABLE[path];
    const pk = PK[path];
    const idx = (db[key] || []).findIndex((r) => String(r[pk]) === String(id));
    if (idx === -1) {
      const err = new Error("Not found");
      err.response = { status: 404 };
      throw err;
    }
    db[key][idx] = { ...db[key][idx], ...payload };
    // 방문권 재발급: valid_hours 오면 start/end 재계산.
    if (path === "visitant" && payload.valid_hours) {
      const start = new Date();
      db[key][idx].parking_start_time = start.toISOString();
      db[key][idx].parking_end_time = new Date(
        start.getTime() + Number(payload.valid_hours) * 3600 * 1000
      ).toISOString();
    }
    save(db);
    return decorate(path, db[key][idx]);
  },

  async remove(path, id) {
    await delay();
    const key = TABLE[path];
    const pk = PK[path];
    // soft delete — matches backend SoftDeleteModel semantics
    const idx = (db[key] || []).findIndex((r) => String(r[pk]) === String(id));
    if (idx !== -1) {
      db[key][idx] = { ...db[key][idx], is_deleted: true };
      save(db);
    }
    return true;
  },

  async restore(path, id) {
    await delay();
    const key = TABLE[path];
    const pk = PK[path];
    const idx = (db[key] || []).findIndex((r) => String(r[pk]) === String(id));
    if (idx !== -1) {
      db[key][idx] = { ...db[key][idx], is_deleted: false };
      save(db);
    }
    return true;
  },

  // ------- auth -------
  // A tiny id/password store so register → login → change-password behave
  // realistically in the demo. Unknown ids still log in (demo convenience);
  // registered ids require the correct password.
  async login(username, password) {
    await delay();
    const accounts = loadAccounts();
    const acc = accounts[username];
    if (acc && String(acc.password) !== String(password ?? "")) {
      const err = new Error("Invalid credentials");
      err.response = { status: 401 };
      throw err;
    }
    return {
      access: "mock-access-" + encodeURIComponent(username || "guest"),
      refresh: "mock-refresh",
    };
  },
  async register(payload) {
    await delay();
    const username = payload.username || payload.user_id || "";
    if (!username || !payload.password) {
      const err = new Error("Bad request");
      err.response = { status: 400, data: { detail: "아이디와 비밀번호는 필수입니다." } };
      throw err;
    }
    const accounts = loadAccounts();
    if (accounts[username]) {
      const err = new Error("Conflict");
      err.response = { status: 400, data: { detail: "이미 존재하는 아이디입니다." } };
      throw err;
    }
    accounts[username] = {
      password: payload.password,
      user_name: payload.user_name || "",
      phone_number: payload.phone_number || "",
    };
    saveAccounts(accounts);
    return { username, ...payload };
  },
  async changePassword({ username, current_password, new_password } = {}) {
    await delay();
    if (!new_password) {
      const err = new Error("Bad request");
      err.response = { status: 400, data: { detail: "새 비밀번호를 입력해 주세요." } };
      throw err;
    }
    const accounts = loadAccounts();
    const acc = accounts[username];
    if (acc && current_password != null && String(acc.password) !== String(current_password)) {
      const err = new Error("Bad request");
      err.response = { status: 400, data: { detail: "현재 비밀번호가 올바르지 않습니다." } };
      throw err;
    }
    accounts[username] = { ...(acc || {}), password: new_password };
    saveAccounts(accounts);
    return { ok: true };
  },
  async me() {
    await delay();
    return {
      username: "관리자(데모)",
      role: "admin",
      is_mock: true,
    };
  },
};
