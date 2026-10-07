import client from "./client";
import { MOCK } from "./config";
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
    async list(params = {}) {
      if (MOCK) return mockApi.list(path, params);
      // Fetch the full set (backend paginates at 20 by default). Without this,
      // callers miss existing rows and create duplicates (e.g. dong-ho by 호수).
      const { data } = await client.get(`${base}/`, { params: { page_size: 500, ...params } });
      return unwrapList(data);
    },
    async get(id) {
      if (MOCK) return mockApi.get(path, id);
      const { data } = await client.get(`${base}/${id}/`);
      return unwrapItem(data);
    },
    async create(payload) {
      if (MOCK) return mockApi.create(path, payload);
      const { data } = await client.post(`${base}/`, payload);
      return unwrapItem(data);
    },
    async update(id, payload) {
      if (MOCK) return mockApi.update(path, id, payload);
      const { data } = await client.put(`${base}/${id}/`, payload);
      return unwrapItem(data);
    },
    async patch(id, payload) {
      if (MOCK) return mockApi.patch(path, id, payload);
      const { data } = await client.patch(`${base}/${id}/`, payload);
      return unwrapItem(data);
    },
    // Restore a soft-deleted row: PATCH {base}/{id}/restore/
    async restore(id) {
      if (MOCK) return mockApi.restore(path, id);
      const { data } = await client.patch(`${base}/${id}/restore/`);
      return unwrapItem(data);
    },
    async remove(id) {
      if (MOCK) return mockApi.remove(path, id);
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
