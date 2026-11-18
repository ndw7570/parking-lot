// P005-003: 서버 max_page_size(200)에 잘리지 않고 전체 목록을 받아야 한다 (B-04).
// 페이지를 나눠 받으면 정렬이 없어 페이지 사이에 행이 겹치거나 빠진다(코드 리뷰 지적).
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./client", () => ({ default: { get: vi.fn() } }));

import client from "./client";
import { vehicleApi } from "./resources";

const rows = (count) => Array.from({ length: count }, (_, i) => ({ vehicle_id: i + 1 }));

describe("crud.list", () => {
  beforeEach(() => client.get.mockReset());

  it("asks for the whole list in one unpaginated request", async () => {
    client.get.mockResolvedValueOnce({ data: rows(250) });

    const list = await vehicleApi.list();

    expect(list).toHaveLength(250);
    expect(client.get).toHaveBeenCalledTimes(1);
    const { params } = client.get.mock.calls[0][1];
    expect(params.no_page).toBe(1);
    expect(params.page_size).toBeUndefined();
  });

  it("keeps caller filters", async () => {
    client.get.mockResolvedValueOnce({ data: rows(1) });

    await vehicleApi.list({ plate_number: "12가3456" });

    expect(client.get.mock.calls[0][1].params.plate_number).toBe("12가3456");
  });

  it("still reads a paginated envelope", async () => {
    client.get.mockResolvedValueOnce({ data: { success: true, meta: {}, results: rows(3) } });

    expect(await vehicleApi.list()).toHaveLength(3);
  });
});
