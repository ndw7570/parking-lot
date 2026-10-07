from django.db import models
from .user_profile import UserProfile
from core.models.common import SoftDeleteModel


class Vehicle(SoftDeleteModel):
    """차량"""
    vehicle_id = models.AutoField(primary_key=True, db_comment="차량ID")
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="user_id",
        related_name="vehicles",
        db_comment="유저아이디",
    )
    parking_type = models.CharField(max_length=100, null=False, blank=True, db_comment="주차유형")
    vehicle_type = models.CharField(max_length=100, null=False, blank=True, db_comment="차종")
    model_name = models.CharField(max_length=100, null=True, blank=True, db_comment="모델명")
    plate_number = models.CharField(max_length=200, null=True, blank=True, db_comment="차량번호")
    color = models.CharField(max_length=20, null=True, blank=True, db_comment="색상")
    tower_yn = models.BooleanField(null=False, blank=True, db_comment="타워가능여부")
    attachment_file_id = models.IntegerField(null=True, blank=True, db_comment="첨부파일ID")
    remarks = models.TextField(null=True, blank=True, db_comment="비고")
    is_deleted = models.BooleanField(null=False, blank=True, db_comment="삭제여부")

    class Meta:
        db_table = '"parking_lot"."vehicles"'
        constraints = [
            models.UniqueConstraint(
                fields=["plate_number"],
                condition=models.Q(is_deleted=False),
                name="uq_vehicles_plate_number",
            )
        ]

    def __str__(self):
        return self.plate_number or str(self.vehicle_id)
