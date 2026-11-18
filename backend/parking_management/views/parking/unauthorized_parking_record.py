from parking_management.views.ownership import me_or_nobody, requested, same
from parking_management.models.parking.unauthorized_parking_record import UnauthorizedParkingRecord
from parking_management.serializers.parking.unauthorized_parking_record import UnauthorizedParkingRecordListSerializer
from parking_management.serializers.parking.unauthorized_parking_record import UnauthorizedParkingRecordDetailSelectSerializer
from core.views.common import BaseCommonViewSet

try:
    from core.constants.filters import UNAUTHORIZED_PARKING_RECORD_FILTER_FIELDS
except ImportError:
    UNAUTHORIZED_PARKING_RECORD_FILTER_FIELDS = {}


class UnauthorizedParkingRecordViewSet(BaseCommonViewSet):
    """
    - GET /unauthorized-parking-record/         → 전체 목록 조회
    - GET /unauthorized-parking-record/{id}/    → 단건 조회
    - POST /unauthorized-parking-record/        → 생성
    - PUT /unauthorized-parking-record/{id}/    → 전체 수정
    - PATCH /unauthorized-parking-record/{id}/  → 부분 수정
    - DELETE /unauthorized-parking-record/{id}/ → 삭제
    """
    queryset = UnauthorizedParkingRecord.objects.all()
    FILTER_FIELDS = UNAUTHORIZED_PARKING_RECORD_FILTER_FIELDS
    list_serializer_class = UnauthorizedParkingRecordListSerializer
    detail_serializer_class = UnauthorizedParkingRecordDetailSelectSerializer

    # 무단주차 접수·출차 처리는 순찰하는 누구나 한다. 기록 삭제는 관리자.
    def can_create(self, me, data):
        return True

    def can_change(self, me, obj, data):
        return True

    def _processor(self) -> str | None:
        # DEBUG 의 AllowAny 에서는 익명 사용자가 빈 문자열을 준다. 모르는 건 비워 둔다.
        return self.request.user.get_username() or None

    def perform_create(self, serializer) -> None:
        # 처음부터 종료된 기록으로 접수하면 접수자가 곧 처리자다.
        extra = {'processed_by': self._processor()} if serializer.validated_data.get('parking_end_time') else {}
        serializer.save(is_deleted=False, **extra)

    def perform_update(self, serializer) -> None:
        # 처리자는 "열린 기록을 닫은 사람" 한 번만 남긴다. 메모 수정이나 다시 닫기로 바뀌지 않는다.
        closing = serializer.instance.parking_end_time is None and serializer.validated_data.get('parking_end_time')
        if closing:
            serializer.save(processed_by=self._processor())
        else:
            serializer.save()
