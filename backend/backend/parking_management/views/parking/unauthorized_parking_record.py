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
