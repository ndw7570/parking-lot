from django.db import models
from .user_profile import UserProfile
from .vehicle import Vehicle
from core.models.common import SoftDeleteModel


class Visitant(SoftDeleteModel):
    """방문자"""

    VALID_HOURS_CHOICES = [
        (6, '6시간'),
        (12, '12시간'),
        (24, '24시간'),
    ]

    visitant_id = models.AutoField(primary_key=True, db_comment="방문자ID")
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        db_column="user_id",
        related_name="visitants",
        db_comment="유저아이디",
    )
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        db_column="vehicle_id",
        related_name="visitants",
        db_comment="차량ID",
    )
    visitant_name = models.CharField(max_length=100, null=True, blank=True, db_comment="방문자이름")
    phone_number = models.CharField(max_length=30, null=True, blank=True, db_comment="연락처")
    remarks = models.TextField(null=True, blank=True, db_comment="비고")
    parking_start_time = models.DateTimeField(null=True, blank=True, db_comment="주차시작시각")
    parking_end_time = models.DateTimeField(null=True, blank=True, db_comment="주차종료시각")
    valid_hours = models.IntegerField(null=True, blank=True, db_comment="가능시간")
    is_deleted = models.BooleanField(null=False, blank=True, db_comment="삭제여부")

    class Meta:
        db_table = '"parking_lot"."visitants"'

    def __str__(self):
        return self.visitant_name or str(self.visitant_id)
