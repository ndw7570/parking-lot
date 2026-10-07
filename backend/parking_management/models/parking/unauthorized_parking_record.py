from django.db import models
from core.models.common import SoftDeleteModel


class UnauthorizedParkingRecord(SoftDeleteModel):
    """무단주차기록"""
    vehicle_id = models.AutoField(primary_key=True, db_comment="차량ID")
    plate_number = models.CharField(max_length=200, null=False, blank=True, db_comment="차량번호")
    phone_number = models.CharField(max_length=30, null=True, blank=True, db_comment="연락처")
    parking_start_time = models.DateTimeField(null=False, blank=True, db_comment="주차시작시각")
    parking_end_time = models.DateTimeField(null=True, blank=True, db_comment="주차종료시각")
    parking_location = models.CharField(max_length=100, null=False, blank=True, db_comment="추자위치")
    attachment_file_id = models.IntegerField(null=True, blank=True, db_comment="첨부파일ID")
    remarks = models.TextField(null=True, blank=True, db_comment="비고")
    is_deleted = models.BooleanField(null=False, blank=True, db_comment="삭제여부")

    class Meta:
        db_table = '"parking_lot"."unauthorized_parking_records"'

    def __str__(self):
        return self.plate_number or str(self.vehicle_id)
