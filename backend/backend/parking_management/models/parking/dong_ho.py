from django.db import models
from .user_profile import UserProfile
from core.models.common import SoftDeleteModel


class DongHo(SoftDeleteModel):
    """동호수"""
    dong_ho_id = models.AutoField(primary_key=True, db_comment="동호수ID")
    dong_ho_name = models.CharField(max_length=100, null=False, blank=True, db_comment="동호수명")
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="user_id",
        related_name="dong_hos",
        db_comment="유저아이디",
    )
    admin_check = models.BooleanField(null=True, blank=True, db_comment="관리자확인")
    remarks = models.TextField(null=True, blank=True, db_comment="비고")

    class Meta:
        db_table = '"parking_lot"."dong_ho"'

    def __str__(self):
        return self.dong_ho_name or str(self.dong_ho_id)
