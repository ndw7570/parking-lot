"""테스트 데이터 생성 도우미.

모델들이 is_deleted 를 기본값 없이 다시 선언했기 때문에 매번 False 를 넘겨야 한다.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from parking_management.models.parking.user_profile import UserProfile
from parking_management.models.parking.vehicle import Vehicle
from parking_management.models.parking.visitant import Visitant


def make_profile(user_id="resident1", **extra):
    fields = {"user_name": "거주민", "phone_number": "010-0000-0000", "is_deleted": False}
    return UserProfile.objects.create(user_id=user_id, **{**fields, **extra})


def make_vehicle(plate="12가3456", user=None, **extra):
    fields = {
        "parking_type": "방문주차",
        "vehicle_type": "승용차",
        "tower_yn": False,
        "is_deleted": False,
    }
    return Vehicle.objects.create(plate_number=plate, user=user, **{**fields, **extra})


def make_visitant(user, vehicle, minutes_left, valid_hours=6):
    now = timezone.now()
    return Visitant.objects.create(
        user=user,
        vehicle=vehicle,
        valid_hours=valid_hours,
        parking_start_time=now - timedelta(hours=valid_hours) + timedelta(minutes=minutes_left),
        parking_end_time=now + timedelta(minutes=minutes_left),
        is_deleted=False,
    )


def auth_client(username="resident1", is_staff=False):
    user = get_user_model().objects.create_user(
        username=username, password="test-pass-1234", is_staff=is_staff
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client
