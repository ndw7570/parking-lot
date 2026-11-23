from django.db import models
from core.models.common import SoftDeleteModel

REPORT_RECEIVED = "RECEIVED"
REPORT_CHECKING = "CHECKING"
REPORT_DONE = "DONE"
REPORT_REJECTED = "REJECTED"
REPORT_STATUS_CHOICES = [
    (REPORT_RECEIVED, "접수"),
    (REPORT_CHECKING, "확인 중"),
    (REPORT_DONE, "처리 완료"),
    (REPORT_REJECTED, "반려"),
]
REPORT_OPEN = (REPORT_RECEIVED, REPORT_CHECKING)


def reporter_ids(record) -> list:
    ids = [record.reported_by] if record.reported_by else []
    return ids + [x for x in (record.co_reporters or "").split("|") if x]


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
    # 화면이 "지금 로그인한 사람"을 처리자로 보여 주던 문제(B-06) 때문에 서버가 기록한다.
    processed_by = models.CharField(max_length=200, null=True, blank=True, db_comment="출차처리자 아이디")
    # 사진 신고(P005-025). 관리자가 바로 접수한 기록은 report_status 가 비어 있다.
    report_status = models.CharField(max_length=20, null=True, blank=True, choices=REPORT_STATUS_CHOICES, db_comment="신고상태")
    reported_by = models.CharField(max_length=200, null=True, blank=True, db_comment="신고자 아이디")
    # 같은 번호에 합쳐진 다른 신고자들. "|아이디|아이디|" 꼴 - 포함 검색으로 "내 신고"를 찾는다.
    co_reporters = models.TextField(null=True, blank=True, db_comment="추가 신고자 아이디 목록")
    report_count = models.IntegerField(default=0, db_comment="신고 횟수(같은 번호 추가 신고 포함)")
    reject_reason = models.TextField(null=True, blank=True, db_comment="반려 사유")
    closed_at = models.DateTimeField(null=True, blank=True, db_comment="신고 처리완료·반려 시각 - 사진 보관 기한 기준")
    photo_keep = models.BooleanField(default=False, db_comment="신고 사진 영구보관")
    is_deleted = models.BooleanField(null=False, blank=True, db_comment="삭제여부")

    class Meta:
        db_table = '"parking_lot"."unauthorized_parking_records"'

    def __str__(self):
        return self.plate_number or str(self.vehicle_id)
