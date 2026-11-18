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
