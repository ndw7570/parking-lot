import client from "./client";
import { isDemo } from "./config";
import { mockApi } from "./mock";

// The Django project mounts the parking router under: /api/parking + router.urls
// The router registers these basenames (see backend urls.py):
//   vehicle, user-profile, dong-ho, visitant, attachment-file,
//   unauthorized-parking-record, post, comment, post-like, comment-like
//
// DRF DefaultRouter yields, per resource:
//   GET    {base}/           list
//   POST   {base}/           create
//   GET    {base}/{id}/      retrieve (detail serializer)
//   PUT    {base}/{id}/      update
//   PATCH  {base}/{id}/      partial update
//   DELETE {base}/{id}/      destroy
const PARKING = "/api/parking";


// DRF list responses may be paginated ({count, next, previous, results}) or a plain array.
export function unwrapList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

// The backend wraps single objects as { success, meta, results: {...} }.
// Return the inner object; pass through plain objects (mock / create responses).
function unwrapItem(data) {
  if (data && typeof data === "object" && !Array.isArray(data.results) && data.results) {
    return data.results;
  }
  return data;
}

function crud(path) {
  const base = `${PARKING}/${path}`;
  return {
    /**
     * 전체 목록. 화면이 KPI·중복 검사에 전체 집합을 쓰므로 페이지 나누기를 끄고 한 번에 받는다.
     * page_size 를 크게 주면 서버 상한(200)에서 조용히 잘리고(B-04), 페이지를 이어 받으면
     * 정렬이 없어 페이지 사이에 행이 겹치거나 빠진다.
     * @param {Record<string, unknown>} params
     * @returns {Promise<object[]>}
     */
    async list(params = {}) {
      if (isDemo()) return mockApi.list(path, params);
      const { data } = await client.get(`${base}/`, { params: { ...params, no_page: 1 } });
      return unwrapList(data);
    },
    async get(id) {
      if (isDemo()) return mockApi.get(path, id);
      const { data } = await client.get(`${base}/${id}/`);
      return unwrapItem(data);
    },
    async create(payload) {
      if (isDemo()) return mockApi.create(path, payload);
      const { data } = await client.post(`${base}/`, payload);
      return unwrapItem(data);
    },
    async update(id, payload) {
      if (isDemo()) return mockApi.update(path, id, payload);
      const { data } = await client.put(`${base}/${id}/`, payload);
      return unwrapItem(data);
    },
    async patch(id, payload) {
      if (isDemo()) return mockApi.patch(path, id, payload);
      const { data } = await client.patch(`${base}/${id}/`, payload);
      return unwrapItem(data);
    },
    // Restore a soft-deleted row: PATCH {base}/{id}/restore/
    async restore(id) {
      if (isDemo()) return mockApi.restore(path, id);
      const { data } = await client.patch(`${base}/${id}/restore/`);
      return unwrapItem(data);
    },
    async remove(id) {
      if (isDemo()) return mockApi.remove(path, id);
      // Standard REST delete. Soft-delete is the BACKEND's job: its destroy()
      // should set is_deleted=true (not hard-delete), filter is_deleted=false in
      // list querysets, and return 200/204 (the current 500 is a backend bug).
      await client.delete(`${base}/${id}/`);
      return true;
    },
  };
}

export const vehicleApi = crud("vehicle");
export const userProfileApi = crud("user-profile");
export const dongHoApi = crud("dong-ho");
export const visitantApi = crud("visitant");
export const unauthorizedApi = crud("unauthorized-parking-record");
export const postApi = crud("post");
export const commentApi = crud("comment");

// ------------------------------------------------------------ 무단주차 사진 신고 (P005-025)
// 서버: backend/parking_management/views/parking/report.py
// 데모(둘러보기)에서는 서버가 없으니 이 화면 안 메모리에만 둔다 - 새로고침하면 사라진다.
export const REPORT_STATUS = {
  RECEIVED: { label: "접수", tone: "warn" },
  CHECKING: { label: "확인 중", tone: "warn" },
  DONE: { label: "처리 완료", tone: "ok" },
  REJECTED: { label: "반려", tone: "danger" },
};
export const isOpenReport = (r) => r?.report_status === "RECEIVED" || r?.report_status === "CHECKING";

const demoReports = [];
const demoPhotos = new Map(); // photo id -> object URL
let demoSeq = 0;

function demoFind(id) {
  const r = demoReports.find((x) => String(x.id) === String(id));
  if (!r) throw Object.assign(new Error("not found"), { response: { status: 404 } });
  return r;
}

export const reportApi = {
  /** @param {{status?: "open"|"closed", mine?: 1}} params */
  async list(params = {}) {
    if (isDemo()) {
      return demoReports.filter((r) =>
        params.status === "open" ? isOpenReport(r) : params.status === "closed" ? !isOpenReport(r) : true
      );
    }
    const { data } = await client.get(`${PARKING}/report/`, { params });
    return unwrapList(data);
  },
  async get(id) {
    if (isDemo()) return { ...demoFind(id) };
    const { data } = await client.get(`${PARKING}/report/${id}/`);
    return data;
  },
  /** @param {{plate_number: string, parking_location: string, remarks?: string, photo?: Blob|null}} input */
  async create({ plate_number, parking_location, remarks, photo }) {
    if (isDemo()) {
      const photos = [];
      if (photo) {
        const pid = ++demoSeq;
        demoPhotos.set(pid, URL.createObjectURL(photo));
        photos.push({ id: pid });
      }
      const open = demoReports.find((r) => r.plate_number === plate_number && isOpenReport(r));
      if (open) {
        open.photos.push(...photos);
        return { ...open, merged: true };
      }
      const row = {
        id: ++demoSeq, plate_number, parking_location, remarks: remarks || null,
        parking_start_time: new Date().toISOString(), report_status: "RECEIVED",
        reported_by: "관리자", report_count: 1, photo_keep: false, photos,
      };
      demoReports.unshift(row);
      return { ...row, merged: false };
    }
    const form = new FormData();
    form.append("plate_number", plate_number);
    form.append("parking_location", parking_location);
    if (remarks) form.append("remarks", remarks);
    if (photo) form.append("photo", photo, "report.jpg");
    // Content-Type 을 지워야 브라우저가 multipart 경계값을 붙인다(기본값이 application/json).
    const { data } = await client.post(`${PARKING}/report/`, form, { headers: { "Content-Type": undefined } });
    return data;
  },
  async patch(id, payload) {
    if (isDemo()) {
      const r = demoFind(id);
      Object.assign(r, payload);
      if (payload.report_status === "DONE" || payload.report_status === "REJECTED") r.closed_at = new Date().toISOString();
      return { ...r };
    }
    const { data } = await client.patch(`${PARKING}/report/${id}/`, payload);
    return data;
  },
  async cancel(id) {
    if (isDemo()) {
      demoReports.splice(demoReports.indexOf(demoFind(id)), 1);
      return true;
    }
    await client.delete(`${PARKING}/report/${id}/`);
    return true;
  },
  async summary() {
    if (isDemo()) {
      return { is_admin: true, new: demoReports.filter((r) => r.report_status === "RECEIVED").length, mine_closed: [] };
    }
    const { data } = await client.get(`${PARKING}/report/summary/`);
    return data;
  },
  /** 사진은 로그인 헤더가 있어야 받으므로 <img src> 대신 받아서 화면 안 주소로 바꾼다. 다 쓰면 revoke. */
  async photoUrl(reportId, photoId) {
    if (isDemo()) return demoPhotos.get(photoId) || null;
    const { data } = await client.get(`${PARKING}/report/${reportId}/photo/${photoId}/`, { responseType: "blob" });
    return URL.createObjectURL(data);
  },
};
