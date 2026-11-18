"""P005-004: 서버 권한. 관리자 = is_staff/is_superuser. 그 밖에는 본인 데이터만 쓴다.

화면(frontend)이 실제로 보내는 요청 흐름이 막히지 않는지도 같이 본다.
"""
from django.test import TestCase
from django.utils import timezone

from parking_management.models.parking.dong_ho import DongHo
from parking_management.models.parking.unauthorized_parking_record import (
    UnauthorizedParkingRecord,
)
from parking_management.models.parking.vehicle import Vehicle
from parking_management.models.posts.post import Post
from parking_management.tests.factories import (
    auth_client,
    make_profile,
    make_vehicle,
    make_visitant,
)

API = "/api/parking"


class PermissionTestBase(TestCase):
    def setUp(self):
        self.me = make_profile("me")
        self.other = make_profile("other")
        self.client = auth_client("me")
        self.admin = auth_client("boss", is_staff=True)


class AdminFlagTests(PermissionTestBase):
    def test_name_containing_관리자_is_not_admin(self):
        fake = auth_client("관리자김씨")
        car = make_vehicle("11가1111", user=self.other, parking_type="지정주차")

        res = fake.delete(f"{API}/vehicle/{car.pk}/")

        self.assertEqual(res.status_code, 403, res.content)

    def test_staff_can_delete_any_vehicle(self):
        car = make_vehicle("11가1111", user=self.other, parking_type="지정주차")

        self.assertEqual(self.admin.delete(f"{API}/vehicle/{car.pk}/").status_code, 200)


class VehicleRuleTests(PermissionTestBase):
    def _payload(self, **extra):
        base = {"plate_number": "22나2222", "parking_type": "거주주차", "vehicle_type": "승용차", "tower_yn": False}
        return {**base, **extra}

    def test_resident_registers_own_vehicle(self):
        res = self.client.post(f"{API}/vehicle/", self._payload(user="me"), format="json")

        self.assertEqual(res.status_code, 201, res.content)

    def test_resident_cannot_register_vehicle_for_someone_else(self):
        res = self.client.post(f"{API}/vehicle/", self._payload(user="other"), format="json")

        self.assertEqual(res.status_code, 403, res.content)

    def test_resident_cannot_edit_someone_elses_vehicle(self):
        car = make_vehicle("33다3333", user=self.other, parking_type="지정주차")

        res = self.client.patch(f"{API}/vehicle/{car.pk}/", {"color": "빨강색"}, format="json")

        self.assertEqual(res.status_code, 403, res.content)

    def test_owner_unassigns_own_vehicle(self):
        """VehicleDetail [차주 지정 해제]"""
        car = make_vehicle("44라4444", user=self.me, parking_type="지정주차")

        res = self.client.patch(
            f"{API}/vehicle/{car.pk}/", {"user": None, "parking_type": "무단주차"}, format="json"
        )

        self.assertEqual(res.status_code, 200, res.content)

    def test_resident_converts_unauthorized_car_to_own_visitor(self):
        """VehicleForm 무단 -> 방문 전환"""
        car = make_vehicle("55마5555", parking_type="무단주차")

        res = self.client.patch(
            f"{API}/vehicle/{car.pk}/", {"user": "me", "parking_type": "방문주차"}, format="json"
        )

        self.assertEqual(res.status_code, 200, res.content)

    def test_resident_restores_deleted_unauthorized_car(self):
        """VehicleForm: 삭제된 무단 차량을 불러와 방문으로 전환하기 전에 복구"""
        car = make_vehicle("66바6666", parking_type="무단주차", is_deleted=True)

        res = self.client.patch(f"{API}/vehicle/{car.pk}/restore/")

        self.assertEqual(res.status_code, 200, res.content)

    def test_resident_cannot_restore_someone_elses_vehicle(self):
        car = make_vehicle("77사7777", user=self.other, parking_type="지정주차", is_deleted=True)

        res = self.client.patch(f"{API}/vehicle/{car.pk}/restore/")

        self.assertEqual(res.status_code, 403, res.content)

    def test_resident_cannot_delete_even_own_vehicle(self):
        car = make_vehicle("88아8888", user=self.me, parking_type="지정주차")

        self.assertEqual(self.client.delete(f"{API}/vehicle/{car.pk}/").status_code, 403)

    def test_anyone_signed_in_can_read(self):
        make_vehicle("99자9999", user=self.other, parking_type="지정주차")

        self.assertEqual(self.client.get(f"{API}/vehicle/").status_code, 200)


class VehicleTypeEscalationTests(PermissionTestBase):
    """보안 리뷰: 일반 사용자가 주차 유형을 바꿔 무단 차량을 "허용"으로 만들 수 없어야 한다."""

    def _new(self, **extra):
        base = {"plate_number": "10가1010", "vehicle_type": "승용차", "tower_yn": False}
        return self.client.post(f"{API}/vehicle/", {**base, **extra}, format="json")

    def test_cannot_whitelist_unauthorized_car(self):
        car = make_vehicle("20가2020", parking_type="무단주차")

        res = self.client.patch(f"{API}/vehicle/{car.pk}/", {"parking_type": "거주주차"}, format="json")

        self.assertEqual(res.status_code, 403, res.content)

    def test_cannot_rewrite_plate_of_unauthorized_car(self):
        car = make_vehicle("30가3030", parking_type="무단주차")

        res = self.client.patch(f"{API}/vehicle/{car.pk}/", {"plate_number": "00허0000"}, format="json")

        self.assertEqual(res.status_code, 403, res.content)

    def test_host_cannot_turn_visitor_car_into_resident(self):
        car = make_vehicle("40가4040", user=self.me, parking_type="방문주차")

        res = self.client.patch(f"{API}/vehicle/{car.pk}/", {"parking_type": "거주주차"}, format="json")

        self.assertEqual(res.status_code, 403, res.content)

    def test_cannot_create_ownerless_allowed_car(self):
        self.assertEqual(self._new(user=None, parking_type="거주주차").status_code, 403)

    def test_reports_ownerless_unauthorized_car(self):
        """UnauthorizedForm: 미등록 번호를 무단주차·차주 없음으로 만든다"""
        self.assertEqual(self._new(user=None, parking_type="무단주차").status_code, 201)

    def test_registers_own_visitor_car(self):
        self.assertEqual(self._new(user="me", parking_type="방문주차").status_code, 201)


class ProfileRuleTests(PermissionTestBase):
    def test_signup_creates_own_profile(self):
        """Register.jsx: 가입 직후 새 계정으로 프로필 생성"""
        newbie = auth_client("newbie")
        payload = {"user_id": "newbie", "user_name": "새사람", "phone_number": "010-1111-2222"}

        self.assertEqual(newbie.post(f"{API}/user-profile/", payload, format="json").status_code, 201)

    def test_cannot_create_profile_for_someone_else(self):
        payload = {"user_id": "stranger", "user_name": "남", "phone_number": "010"}

        self.assertEqual(self.client.post(f"{API}/user-profile/", payload, format="json").status_code, 403)

    def test_edits_own_profile_not_others(self):
        own = self.client.patch(f"{API}/user-profile/me/", {"user_name": "나"}, format="json")
        others = self.client.patch(f"{API}/user-profile/other/", {"user_name": "남"}, format="json")

        self.assertEqual(own.status_code, 200, own.content)
        self.assertEqual(others.status_code, 403, others.content)


class DongHoRuleTests(PermissionTestBase):
    def test_creates_empty_unit_placeholder(self):
        """Residents.jsx: 빈 세대 자리표시를 누르면 세대 행 생성"""
        res = self.client.post(f"{API}/dong-ho/", {"dong_ho_name": "101호", "user": None}, format="json")

        self.assertEqual(res.status_code, 201, res.content)

    def test_moves_into_empty_unit(self):
        unit = DongHo.objects.create(dong_ho_name="102호", is_deleted=False)

        res = self.client.patch(f"{API}/dong-ho/{unit.pk}/", {"user": "me"}, format="json")

        self.assertEqual(res.status_code, 200, res.content)

    def test_cannot_put_someone_else_into_empty_unit(self):
        unit = DongHo.objects.create(dong_ho_name="103호", is_deleted=False)

        res = self.client.patch(f"{API}/dong-ho/{unit.pk}/", {"user": "other"}, format="json")

        self.assertEqual(res.status_code, 403, res.content)

    def test_current_resident_hands_over_unit(self):
        """ResidentLinkPage: 현재 거주민이 다른 거주민으로 바꾸거나 빈집 전환"""
        unit = DongHo.objects.create(dong_ho_name="104호", user=self.me, is_deleted=False)

        res = self.client.patch(f"{API}/dong-ho/{unit.pk}/", {"user": "other"}, format="json")

        self.assertEqual(res.status_code, 200, res.content)

    def test_cannot_take_over_occupied_unit(self):
        unit = DongHo.objects.create(dong_ho_name="105호", user=self.other, is_deleted=False)

        res = self.client.patch(f"{API}/dong-ho/{unit.pk}/", {"user": "me"}, format="json")

        self.assertEqual(res.status_code, 403, res.content)


class VisitantRuleTests(PermissionTestBase):
    def test_issues_ticket_as_host(self):
        car = make_vehicle("12가0001", user=self.me)
        payload = {"user": "me", "vehicle": car.pk, "valid_hours": 6}

        self.assertEqual(self.client.post(f"{API}/visitant/", payload, format="json").status_code, 201)

    def test_cannot_issue_ticket_as_someone_else(self):
        car = make_vehicle("12가0002", user=self.me)
        payload = {"user": "other", "vehicle": car.pk, "valid_hours": 6}

        self.assertEqual(self.client.post(f"{API}/visitant/", payload, format="json").status_code, 403)

    def test_host_removes_own_ticket_not_others(self):
        """VehicleForm: 거주민 차량으로 바꿀 때 기존 티켓 삭제"""
        mine = make_visitant(self.me, make_vehicle("12가0003", user=self.me), minutes_left=60)
        theirs = make_visitant(self.other, make_vehicle("12가0004", user=self.other), minutes_left=60)

        self.assertEqual(self.client.delete(f"{API}/visitant/{mine.pk}/").status_code, 200)
        self.assertEqual(self.client.delete(f"{API}/visitant/{theirs.pk}/").status_code, 403)


class UnauthorizedRuleTests(PermissionTestBase):
    def test_any_resident_reports_and_closes(self):
        now = timezone.now().isoformat()
        payload = {"plate_number": "00가0000", "parking_start_time": now, "parking_location": "지상"}
        created = self.client.post(f"{API}/unauthorized-parking-record/", payload, format="json")
        self.assertEqual(created.status_code, 201, created.content)
        pk = created.json()["vehicle_id"]

        res = self.client.patch(f"{API}/unauthorized-parking-record/{pk}/", {"parking_end_time": now}, format="json")

        self.assertEqual(res.status_code, 200, res.content)

    def test_only_admin_deletes_record(self):
        rec = UnauthorizedParkingRecord.objects.create(
            plate_number="00가0001", parking_start_time=timezone.now(), parking_location="지상", is_deleted=False
        )

        self.assertEqual(self.client.delete(f"{API}/unauthorized-parking-record/{rec.pk}/").status_code, 403)


class BoardRuleTests(PermissionTestBase):
    def test_writes_post_and_comment(self):
        """PostDetail: 작성자 없이 글·댓글을 만든다"""
        post = self.client.post(f"{API}/post/", {"title": "안녕", "is_pinned": False}, format="json")
        self.assertEqual(post.status_code, 201, post.content)

        comment = self.client.post(
            f"{API}/comment/", {"post": post.json()["posts_id"], "content": "댓글"}, format="json"
        )

        self.assertEqual(comment.status_code, 201, comment.content)

    def test_edits_own_post_only(self):
        mine = Post.objects.create(title="내 글", user=self.me, is_pinned=False, is_deleted=False)
        theirs = Post.objects.create(title="남 글", user=self.other, is_pinned=False, is_deleted=False)

        self.assertEqual(self.client.patch(f"{API}/post/{mine.pk}/", {"title": "수정"}, format="json").status_code, 200)
        self.assertEqual(self.client.patch(f"{API}/post/{theirs.pk}/", {"title": "수정"}, format="json").status_code, 403)

    def test_attachment_write_is_admin_only(self):
        payload = {"attachment_table": "posts", "search_id": 1, "file_url": "x"}

        self.assertEqual(self.client.post(f"{API}/attachment-file/", payload, format="json").status_code, 403)


class DeletedVehicleIsNotAlive(TestCase):
    def test_factory_flag(self):
        car = make_vehicle("01가0101", is_deleted=True)

        self.assertFalse(Vehicle.objects.filter(pk=car.pk).exists())
