"""P005-002: 방문 티켓 발급 규칙 (B-01, B-02)."""
from django.test import TestCase

from parking_management.models.parking.visitant import Visitant
from parking_management.tests.factories import (
    auth_client,
    make_profile,
    make_vehicle,
    make_visitant,
)

URL = "/api/parking/visitant/"


class VisitantReissueTests(TestCase):
    def setUp(self):
        self.client = auth_client()
        self.host = make_profile()
        self.vehicle = make_vehicle()

    def _issue(self, **extra):
        payload = {"user": self.host.pk, "vehicle": self.vehicle.pk, "valid_hours": 6}
        return self.client.post(URL, {**payload, **extra}, format="json")

    def test_issues_ticket_when_vehicle_has_no_active_ticket(self):
        res = self._issue()

        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(Visitant.objects.count(), 1)

    def test_rejects_reissue_when_active_ticket_has_more_than_30_minutes_left(self):
        make_visitant(self.host, self.vehicle, minutes_left=120)

        res = self._issue()

        self.assertEqual(res.status_code, 400, res.content)
        self.assertIn("30분 전부터", str(res.json()))

    def test_allows_reissue_within_30_minutes_of_expiry(self):
        make_visitant(self.host, self.vehicle, minutes_left=20)

        res = self._issue()

        self.assertEqual(res.status_code, 201, res.content)

    def test_allows_reissue_after_previous_ticket_expired(self):
        make_visitant(self.host, self.vehicle, minutes_left=-10)

        res = self._issue()

        self.assertEqual(res.status_code, 201, res.content)

    def test_rejects_missing_valid_hours_with_400(self):
        payload = {"user": self.host.pk, "vehicle": self.vehicle.pk}

        res = self.client.post(URL, payload, format="json")

        self.assertEqual(res.status_code, 400, res.content)
        self.assertIn("valid_hours", res.json())

    def test_rejects_valid_hours_outside_6_12_24(self):
        res = self._issue(valid_hours=7)

        self.assertEqual(res.status_code, 400, res.content)

    def test_patch_without_valid_hours_keeps_times(self):
        ticket = make_visitant(self.host, self.vehicle, minutes_left=120)
        before = ticket.parking_end_time

        res = self.client.patch(f"{URL}{ticket.pk}/", {"remarks": "메모"}, format="json")

        self.assertEqual(res.status_code, 200, res.content)
        ticket.refresh_from_db()
        self.assertEqual(ticket.parking_end_time, before)
