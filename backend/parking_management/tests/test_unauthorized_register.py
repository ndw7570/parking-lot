"""무단주차 접수가 "저장에 실패했습니다" 하나로 뭉개지던 문제.

- 차량 만들기와 기록 만들기를 화면이 두 번 나눠 불러, 뒤엣것이 실패하면 차량만 남고
  다시 시도하면 "이미 존재"로 영영 실패했다 -> 서버가 한 번에(원자적으로) 만든다.
- 같은 번호를 두 번 접수하면 열린 기록이 두 개 생겼다 -> 409 로 거절한다.
- 거주·방문 차량 접수는 화면만 막았다 -> 서버도 막는다.
- 모든 오류는 { error: { code, message } } 를 싣는다. 화면은 code 로 문장을 고른다.
"""
from unittest import mock

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from parking_management.models.parking.unauthorized_parking_record import UnauthorizedParkingRecord
from parking_management.models.parking.vehicle import Vehicle
from parking_management.tests.factories import auth_client, make_profile, make_vehicle

URL = "/api/parking/unauthorized-parking-record/"


def body(plate="77무7777", **extra):
    return {
        "plate_number": plate,
        "parking_start_time": timezone.now().isoformat(),
        "parking_location": "지상",
        "is_deleted": False,
        **extra,
    }


class RegisterTests(TestCase):
    def setUp(self):
        self.client = auth_client("resident1")

    def test_new_plate_creates_vehicle_and_record_together(self):
        # Act
        res = self.client.post(URL, body(), format="json")
        # Assert
        self.assertEqual(res.status_code, 201, res.content)
        self.assertTrue(Vehicle.objects.filter(plate_number="77무7777", parking_type="무단주차").exists())
        self.assertEqual(UnauthorizedParkingRecord.objects.count(), 1)

    def test_known_unauthorized_vehicle_is_reused(self):
        make_vehicle("77무7777", parking_type="무단주차")
        res = self.client.post(URL, body(), format="json")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(Vehicle.objects.filter(plate_number="77무7777").count(), 1)

    def test_plate_is_normalized(self):
        res = self.client.post(URL, body("77무 7777"), format="json")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(UnauthorizedParkingRecord.objects.get().plate_number, "77무7777")

    def test_second_open_record_for_same_plate_is_rejected(self):
        self.client.post(URL, body(), format="json")
        res = self.client.post(URL, body(), format="json")
        self.assertEqual(res.status_code, 409, res.content)
        self.assertEqual(res.data["error"]["code"], "ALREADY_OPEN")
        self.assertEqual(UnauthorizedParkingRecord.objects.count(), 1)

    def test_plate_can_be_registered_again_after_exit(self):
        self.client.post(URL, body(), format="json")
        UnauthorizedParkingRecord.objects.update(parking_end_time=timezone.now())
        res = self.client.post(URL, body(), format="json")
        self.assertEqual(res.status_code, 201, res.content)

    def test_resident_vehicle_is_rejected(self):
        make_vehicle("12가3456", user=make_profile("owner1"), parking_type="거주주차")
        res = self.client.post(URL, body("12가3456"), format="json")
        self.assertEqual(res.status_code, 400, res.content)
        self.assertEqual(res.data["error"]["code"], "HAS_PERMIT")
        self.assertFalse(UnauthorizedParkingRecord.objects.exists())

    def test_visitor_vehicle_is_rejected(self):
        make_vehicle("12가3456", parking_type="방문주차")
        res = self.client.post(URL, body("12가3456"), format="json")
        self.assertEqual(res.data["error"]["code"], "HAS_PERMIT")

    def test_failed_record_leaves_no_vehicle_behind(self):
        res = self.client.post(URL, body(parking_location=None), format="json")
        self.assertEqual(res.status_code, 400, res.content)
        self.assertFalse(Vehicle.objects.filter(plate_number="77무7777").exists())

    def test_empty_plate_is_rejected_with_code(self):
        res = self.client.post(URL, body(" "), format="json")
        self.assertEqual(res.status_code, 400, res.content)
        self.assertEqual(res.data["error"]["code"], "VALIDATION_ERROR")


class ErrorEnvelopeTests(TestCase):
    def test_validation_error_keeps_field_errors_and_adds_code(self):
        client = auth_client("resident1")
        res = client.post(URL, body("1" * 250), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["error"]["code"], "VALIDATION_ERROR")
        self.assertIn("plate_number", res.data)  # 기존 화면이 읽는 필드 오류는 그대로
        self.assertTrue(res.data["error"]["message"])

    def test_missing_login_has_code(self):
        res = APIClient().post(URL, body(), format="json")
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.data["error"]["code"], "NOT_AUTHENTICATED")

    def test_forbidden_has_code(self):
        client = auth_client("resident1")
        rec = UnauthorizedParkingRecord.objects.create(
            plate_number="77무7777", parking_start_time=timezone.now(), parking_location="지상", is_deleted=False
        )
        res = client.delete(f"{URL}{rec.pk}/")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.data["error"]["code"], "PERMISSION_DENIED")

    def test_not_found_has_code(self):
        res = auth_client("resident1").get(f"{URL}999999/")
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.data["error"]["code"], "NOT_FOUND")

    def test_unexpected_crash_returns_json_and_is_logged(self):
        client = auth_client("resident1")
        boom = RuntimeError("column processed_by does not exist")
        with mock.patch(
            "parking_management.views.parking.unauthorized_parking_record.UnauthorizedParkingRecordViewSet.perform_create",
            side_effect=boom,
        ), self.assertLogs("core.errors", level="ERROR") as logs:
            res = client.post(URL, body(), format="json")
        self.assertEqual(res.status_code, 500)
        self.assertEqual(res.data["error"]["code"], "SERVER_ERROR")
        # 사용자 문장에는 내부 사정(컬럼 이름 등)이 들어가지 않는다. 로그에는 남는다.
        self.assertNotIn("processed_by", res.data["error"]["message"])
        self.assertIn("processed_by", "\n".join(logs.output))
