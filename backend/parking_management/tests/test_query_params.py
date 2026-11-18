"""P005-006: 조회 파라미터 정의 오류 (B-03)."""
from django.test import TestCase

from parking_management.tests.factories import auth_client, make_vehicle

URL = "/api/parking/vehicle/"


def plates(res) -> set:
    body = res.json()
    rows = body["results"] if isinstance(body, dict) else body
    return {row["plate_number"] for row in rows}


class VehicleFilterTests(TestCase):
    def setUp(self):
        self.client = auth_client()
        make_vehicle("11가1111", parking_type="무단주차")
        make_vehicle("22나2222", parking_type="방문주차")

    def test_filters_by_plate_number(self):
        res = self.client.get(URL, {"plate_number": "11가1111"})

        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(plates(res), {"11가1111"})

    def test_filters_by_parking_type(self):
        res = self.client.get(URL, {"parking_type": "방문주차"})

        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(plates(res), {"22나2222"})


class CommonParamTests(TestCase):
    """쉼표가 빠져 'summary' 와 'dup_check' 가 한 문자열로 붙어 있었다."""

    def setUp(self):
        self.client = auth_client()

    def test_accepts_summary_param(self):
        res = self.client.get(URL, {"summary": "1"})

        self.assertEqual(res.status_code, 200, res.content)

    def test_accepts_dup_check_param(self):
        res = self.client.get(URL, {"dup_check": "1"})

        self.assertEqual(res.status_code, 200, res.content)

    def test_rejects_unknown_param(self):
        res = self.client.get(URL, {"nope": "1"})

        self.assertEqual(res.status_code, 400, res.content)


class NoPageTests(TestCase):
    """P005-003: 프론트는 전체 목록을 no_page=1 한 번으로 받는다. 서버 상한(200)에 잘리면 안 된다."""

    def setUp(self):
        self.client = auth_client()
        for i in range(205):
            make_vehicle(f"{i:03d}가{i:04d}")

    def test_returns_every_row_without_pagination(self):
        res = self.client.get(URL, {"no_page": "1"})

        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(len(res.json()), 205)

    def test_combines_with_filter(self):
        res = self.client.get(URL, {"no_page": "1", "plate_number": "007가0007"})

        self.assertEqual(plates(res), {"007가0007"})


class PartialPlateSearchTests(TestCase):
    """P005-013: 권한 확인 화면은 번호 일부로 찾는다. 정확 일치(plate_number)는 중복 검사용으로 남긴다."""

    def setUp(self):
        self.client = auth_client()
        make_vehicle("12가3456")
        make_vehicle("98나3456")
        make_vehicle("12다7777")

    def test_finds_by_part_of_plate(self):
        res = self.client.get(URL, {"plate_number_contains": "3456"})

        self.assertEqual(plates(res), {"12가3456", "98나3456"})

    def test_exact_lookup_stays_exact(self):
        res = self.client.get(URL, {"plate_number": "3456"})

        self.assertEqual(plates(res), set())
