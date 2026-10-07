from django.db import models
from core.models.common import SoftDeleteModel


class UserProfile(SoftDeleteModel):
    """유저"""
    user_id = models.CharField(primary_key=True, max_length=200, db_comment="유저아이디")
    dong_ho_id = models.IntegerField(null=True, blank=True, db_comment="동호수ID")
    user_name = models.CharField(max_length=100, null=False, blank=True, db_comment="유저명")
    phone_number = models.CharField(max_length=30, null=False, blank=True, db_comment="연락처")
    residence_type = models.CharField(max_length=50, null=True, blank=True, db_comment="거주유형")
    exp_resi_start_date = models.DateField(null=True, blank=True, db_comment="예상거주시작일")
    exp_resi_end_date = models.DateField(null=True, blank=True, db_comment="예상거주종료일")
    is_deleted = models.BooleanField(null=False, blank=True, db_comment="삭제여부")

    class Meta:
        db_table = '"parking_lot"."user_profile"'

    def __str__(self):
        return self.user_name or str(self.user_id)
