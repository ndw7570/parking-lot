from parking_management.views.ownership import me_or_nobody, requested, same
from parking_management.models.parking.unauthorized_parking_record import UnauthorizedParkingRecord
from parking_management.serializers.parking.unauthorized_parking_record import UnauthorizedParkingRecordListSerializer
from parking_management.serializers.parking.unauthorized_parking_record import UnauthorizedParkingRecordDetailSelectSerializer
from django.db import transaction
from rest_framework.exceptions import ValidationError

from core.errors import AppError, ConflictError
from core.views.common import BaseCommonViewSet
from parking_management.models.parking.vehicle import Vehicle

# 이 유형의 차량은 서도 되는 차라 무단으로 접수하지 않는다(FR-6.3).
PERMIT_TYPES = ('거주주차', '방문주차', '지정주차')
UNAUTHORIZED_TYPE = '무단주차'

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
        # 접수는 "차량이 없으면 무단 차량으로 만들고 + 기록 생성"을 한 번에 한다. 화면이 두 번
        # 나눠 부르던 때는 뒤엣것이 실패하면 차량만 남고, 다시 시도하면 "이미 존재"로 영영 실패했다.
        plate = "".join(str(serializer.validated_data.get('plate_number') or '').split()).upper()
        if not plate:
            raise ValidationError({'plate_number': ['차량번호를 입력해 주세요.']})
        with transaction.atomic():
            vehicle = Vehicle.objects.select_for_update().filter(plate_number=plate).first()
            if vehicle and vehicle.parking_type in PERMIT_TYPES:
                raise AppError(f'{vehicle.parking_type} 차량이라 무단주차로 접수할 수 없습니다.', code='HAS_PERMIT')
            open_exists = UnauthorizedParkingRecord.objects.select_for_update().filter(
                plate_number=plate, parking_end_time__isnull=True
            ).exists()
            if open_exists and not serializer.validated_data.get('parking_end_time'):
                raise ConflictError('이미 주차 중으로 접수된 차량입니다. 무단주차 목록에서 확인해 주세요.', code='ALREADY_OPEN')
            if vehicle is None:
                Vehicle.objects.create(
                    plate_number=plate, parking_type=UNAUTHORIZED_TYPE, vehicle_type='기타',
                    user=None, tower_yn=False, is_deleted=False,
                )
            # 처음부터 종료된 기록으로 접수하면 접수자가 곧 처리자다.
            extra = {'processed_by': self._processor()} if serializer.validated_data.get('parking_end_time') else {}
            serializer.save(is_deleted=False, plate_number=plate, **extra)

    def perform_update(self, serializer) -> None:
        # 처리자는 "열린 기록을 닫은 사람" 한 번만 남긴다. 메모 수정이나 다시 닫기로 바뀌지 않는다.
        closing = serializer.instance.parking_end_time is None and serializer.validated_data.get('parking_end_time')
        if closing:
            serializer.save(processed_by=self._processor())
        else:
            serializer.save()
