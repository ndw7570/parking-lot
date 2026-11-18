"""P005-008: 출차 처리한 사람을 기록에 남긴다 (B-06)."""
from django.test import TestCase
from django.utils import timezone

from parking_management.models.parking.unauthorized_parking_record import (
    UnauthorizedParkingRecord,
)
from parking_management.tests.factories import auth_client

URL = "/api/parking/unauthorized-parking-record/"


class ProcessorTests(TestCase):
    def setUp(self):
        self.client = auth_client(username="guard1")
        self.record = UnauthorizedParkingRecord.objects.create(
            plate_number="12가3456",
            parking_start_time=timezone.now(),
            parking_location="지상",
            is_deleted=False,
        )

    def _close(self, extra=None):
        payload = {"parking_end_time": timezone.now().isoformat(), **(extra or {})}
        return self.client.patch(f"{URL}{self.record.pk}/", payload, format="json")

    def test_records_who_closed_the_parking(self):
        res = self._close()

        self.assertEqual(res.status_code, 200, res.content)
        self.record.refresh_from_db()
        self.assertEqual(self.record.processed_by, "guard1")

    def test_processor_cannot_be_forged_by_client(self):
        res = self._close({"processed_by": "someone_else"})

        self.assertEqual(res.status_code, 200, res.content)
        self.record.refresh_from_db()
        self.assertEqual(self.record.processed_by, "guard1")

    def test_editing_remarks_does_not_set_processor(self):
        res = self.client.patch(f"{URL}{self.record.pk}/", {"remarks": "메모"}, format="json")

        self.assertEqual(res.status_code, 200, res.content)
        self.record.refresh_from_db()
        self.assertIsNone(self.record.processed_by)

    def test_processor_is_returned_in_list(self):
        self._close()

        res = self.client.get(URL)

        row = res.json()["results"][0]
        self.assertEqual(row["processed_by"], "guard1")

    def test_closing_again_keeps_first_processor(self):
        self._close()
        other = auth_client(username="guard2")

        other.patch(f"{URL}{self.record.pk}/", {"parking_end_time": timezone.now().isoformat()}, format="json")

        self.record.refresh_from_db()
        self.assertEqual(self.record.processed_by, "guard1")

    def test_creating_closed_record_sets_processor(self):
        now = timezone.now().isoformat()
        payload = {
            "plate_number": "99하9999",
            "parking_start_time": now,
            "parking_end_time": now,
            "parking_location": "지상",
        }

        res = self.client.post(URL, payload, format="json")

        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["processed_by"], "guard1")
