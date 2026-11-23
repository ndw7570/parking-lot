from core.serializers.soft_exclusion import SoftDeleteSerializer, SoftWhitelistBaseSerializer
from parking_management.models.parking.unauthorized_parking_record import UnauthorizedParkingRecord

# 신고자 아이디는 이 목록(로그인한 누구나 봄)에 싣지 않는다 - 누가 신고했는지 이웃에게 드러나지 않게.
HIDDEN = ('reported_by', 'co_reporters')
READ_ONLY = ('processed_by', 'report_status', 'report_count', 'reject_reason', 'closed_at', 'photo_keep')


class UnauthorizedParkingRecordListSerializer(SoftDeleteSerializer):
    class Meta:
        model = UnauthorizedParkingRecord
        exclude = HIDDEN
        # 처리자·신고 칸은 서버가 채운다. 이 일반 API 로는 신고 상태를 못 바꾼다(신고 API 전용).
        read_only_fields = READ_ONLY


class UnauthorizedParkingRecordDetailSelectSerializer(SoftDeleteSerializer):
    class Meta:
        model = UnauthorizedParkingRecord
        exclude = HIDDEN
        # 처리자·신고 칸은 서버가 채운다. 이 일반 API 로는 신고 상태를 못 바꾼다(신고 API 전용).
        read_only_fields = READ_ONLY
