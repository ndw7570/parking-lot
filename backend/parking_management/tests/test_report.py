"""P005-025: 무단주차 사진 신고."""
import shutil
import tempfile
from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from parking_management import report_photos
from parking_management.models.parking.unauthorized_parking_record import UnauthorizedParkingRecord
from parking_management.tests.factories import auth_client

URL = "/api/parking/report/"
OLD_URL = "/api/parking/unauthorized-parking-record/"

# APP0(JFIF) + APP1(EXIF, GPS 자리) + SOS + 그림 데이터 + EOI 로 된 아주 작은 JPEG 모양
APP0 = b"\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
EXIF = b"\xff\xe1\x00\x0eExif\x00\x00GPS!!!"
SOS = b"\xff\xda\x00\x08\x01\x01\x00\x00\x3f\x00"
JPEG = b"\xff\xd8" + APP0 + EXIF + SOS + b"\x12\x34\x56" + b"\xff\xd9"


def photo(data=JPEG, name="p.jpg"):
    return SimpleUploadedFile(name, data, content_type="image/jpeg")


class ReportTestBase(TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.override = override_settings(REPORT_PHOTO_ROOT=self.tmp)
        self.override.enable()
        self.resident = auth_client("resident1")
        self.other = auth_client("resident2")
        self.admin = auth_client("admin", is_staff=True)

    def tearDown(self):
        self.override.disable()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def report(self, client=None, plate="12가3456", with_photo=True, **extra):
        data = {"plate_number": plate, "parking_location": "지상", **extra}
        if with_photo:
            data["photo"] = photo()
        return (client or self.resident).post(URL, data, format="multipart")


class CreateTests(ReportTestBase):
    def test_resident_reports_with_photo(self):
        res = self.report()
        self.assertEqual(res.status_code, 201, res.content)
        rec = UnauthorizedParkingRecord.objects.get(pk=res.data["id"])
        self.assertEqual(rec.report_status, "RECEIVED")
        self.assertEqual(rec.reported_by, "resident1")
        self.assertEqual(rec.report_count, 1)
        self.assertIsNone(rec.parking_end_time)
        self.assertEqual(len(res.data["photos"]), 1)

    def test_gps_metadata_is_removed(self):
        res = self.report()
        att = report_photos.photos_of(res.data["id"]).get()
        saved = report_photos.photo_path(att).read_bytes()
        self.assertNotIn(b"Exif", saved)
        self.assertNotIn(b"GPS", saved)
        self.assertIn(b"JFIF", saved)
        self.assertTrue(saved.endswith(b"\x12\x34\x56\xff\xd9"))

    def test_rejects_non_jpeg(self):
        res = self.resident.post(URL, {"plate_number": "12가3456", "photo": photo(b"\x89PNG....")}, format="multipart")
        self.assertEqual(res.status_code, 400)
        self.assertFalse(UnauthorizedParkingRecord.objects.exists())

    def test_report_without_photo(self):
        res = self.report(with_photo=False)
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.data["photos"], [])

    def test_same_plate_is_merged(self):
        first = self.report()
        second = self.report(self.other, plate="12가 3456")
        self.assertEqual(second.status_code, 201, second.content)
        self.assertTrue(second.data["merged"])
        self.assertEqual(first.data["id"], second.data["id"])
        rec = UnauthorizedParkingRecord.objects.get(pk=first.data["id"])
        self.assertEqual(rec.report_count, 2)
        self.assertEqual(report_photos.photos_of(rec.pk).count(), 2)

    def test_joins_existing_open_unauthorized_record(self):
        rec = UnauthorizedParkingRecord.objects.create(
            plate_number="12가3456", parking_start_time=timezone.now(), parking_location="지상", is_deleted=False
        )
        res = self.report()
        self.assertEqual(res.data["id"], rec.pk)
        rec.refresh_from_db()
        self.assertEqual(rec.report_status, "RECEIVED")
        self.assertEqual(rec.reported_by, "resident1")

    @override_settings(REPORT_HOURLY_LIMIT=2)
    def test_hourly_limit(self):
        self.assertEqual(self.report(plate="11가1111").status_code, 201)
        self.assertEqual(self.report(plate="22가2222").status_code, 201)
        self.assertEqual(self.report(plate="33가3333").status_code, 400)

    def test_requires_login(self):
        from rest_framework.test import APIClient
        res = APIClient().post(URL, {"plate_number": "12가3456"}, format="multipart")
        self.assertEqual(res.status_code, 401)


class VisibilityTests(ReportTestBase):
    def setUp(self):
        super().setUp()
        self.rid = self.report().data["id"]
        self.att_id = report_photos.photos_of(self.rid).get().attachment_file_id

    def test_resident_sees_only_own(self):
        self.assertEqual(len(self.resident.get(URL).data), 1)
        self.assertEqual(len(self.other.get(URL).data), 0)
        self.assertEqual(self.other.get(f"{URL}{self.rid}/").status_code, 404)

    def test_admin_sees_all(self):
        self.assertEqual(len(self.admin.get(URL).data), 1)

    def test_photo_access(self):
        self.assertEqual(self.resident.get(f"{URL}{self.rid}/photo/{self.att_id}/").status_code, 200)
        self.assertEqual(self.admin.get(f"{URL}{self.rid}/photo/{self.att_id}/").status_code, 200)
        self.assertEqual(self.other.get(f"{URL}{self.rid}/photo/{self.att_id}/").status_code, 404)

    def test_co_reporter_sees_report_but_only_own_photo(self):
        self.report(self.other)
        res = self.other.get(f"{URL}{self.rid}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(self.other.get(URL).data), 1)
        own = [p["id"] for p in res.data["photos"]]
        self.assertEqual(len(own), 1)
        self.assertNotIn(self.att_id, own)
        self.assertEqual(self.other.get(f"{URL}{self.rid}/photo/{self.att_id}/").status_code, 404)

    def test_same_person_twice_does_not_raise_count(self):
        self.report()
        self.assertEqual(UnauthorizedParkingRecord.objects.get(pk=self.rid).report_count, 1)

    def test_old_list_hides_reporter(self):
        row = self.other.get(f"{OLD_URL}{self.rid}/").data
        row = row.get("results", row)
        self.assertNotIn("reported_by", row)
        self.assertNotIn("co_reporters", row)
        self.assertEqual(row["report_status"], "RECEIVED")

    def test_old_api_cannot_change_report_fields(self):
        res = self.other.patch(f"{OLD_URL}{self.rid}/", {"report_status": "DONE", "photo_keep": True}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        rec = UnauthorizedParkingRecord.objects.get(pk=self.rid)
        self.assertEqual(rec.report_status, "RECEIVED")
        self.assertFalse(rec.photo_keep)


class HandleTests(ReportTestBase):
    def setUp(self):
        super().setUp()
        self.rid = self.report().data["id"]

    def patch(self, client, **data):
        return client.patch(f"{URL}{self.rid}/", data, format="json")

    def test_resident_cannot_handle(self):
        self.assertEqual(self.patch(self.resident, report_status="DONE").status_code, 403)
        self.assertEqual(self.patch(self.resident, photo_keep=True).status_code, 403)

    def test_admin_done_closes_parking(self):
        res = self.patch(self.admin, report_status="DONE")
        self.assertEqual(res.status_code, 200, res.content)
        rec = UnauthorizedParkingRecord.objects.get(pk=self.rid)
        self.assertEqual(rec.report_status, "DONE")
        self.assertIsNotNone(rec.closed_at)
        self.assertIsNotNone(rec.parking_end_time)
        self.assertEqual(rec.processed_by, "admin")

    def test_reject_needs_reason(self):
        self.assertEqual(self.patch(self.admin, report_status="REJECTED").status_code, 400)
        res = self.patch(self.admin, report_status="REJECTED", reject_reason="방문 등록된 차량")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.resident.get(f"{URL}{self.rid}/").data["reject_reason"], "방문 등록된 차량")

    def test_closed_report_cannot_reopen(self):
        self.patch(self.admin, report_status="DONE")
        self.assertEqual(self.patch(self.admin, report_status="CHECKING").status_code, 400)

    def test_reporter_sees_result_in_summary(self):
        self.patch(self.admin, report_status="DONE")
        mine = self.resident.get(f"{URL}summary/").data["mine_closed"]
        self.assertEqual([m["id"] for m in mine], [self.rid])

    def test_admin_summary_counts_new(self):
        self.assertEqual(self.admin.get(f"{URL}summary/").data["new"], 1)
        self.assertEqual(self.resident.get(f"{URL}summary/").data["new"], 0)

    def test_reporter_can_cancel_while_received(self):
        self.assertEqual(self.resident.delete(f"{URL}{self.rid}/").status_code, 200)
        self.assertEqual(len(self.admin.get(URL).data), 0)

    def test_cannot_cancel_after_checking(self):
        self.patch(self.admin, report_status="CHECKING")
        self.assertEqual(self.resident.delete(f"{URL}{self.rid}/").status_code, 403)


class PurgeTests(ReportTestBase):
    def _closed_report(self, plate, days_ago, keep=False):
        rid = self.report(plate=plate).data["id"]
        UnauthorizedParkingRecord.objects.filter(pk=rid).update(
            report_status="DONE", parking_end_time=timezone.now(),
            closed_at=timezone.now() - timedelta(days=days_ago), photo_keep=keep,
        )
        return report_photos.photos_of(rid).get()

    def test_purges_after_30_days_but_keeps_permanent(self):
        old = self._closed_report("11가1111", 31)
        kept = self._closed_report("22가2222", 31, keep=True)
        recent = self._closed_report("33가3333", 10)
        old_path = report_photos.photo_path(old)
        call_command("purge_report_photos", stdout=open(__import__("os").devnull, "w", encoding="utf-8"))
        self.assertFalse(old_path.exists())
        self.assertEqual(report_photos.photos_of(old.search_id).count(), 0)
        self.assertTrue(report_photos.photo_path(kept).exists())
        self.assertTrue(report_photos.photo_path(recent).exists())
