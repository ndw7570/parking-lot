from parking_management.views.ownership import me_or_nobody, requested, same
from parking_management.models.parking.vehicle import Vehicle
from parking_management.serializers.parking.vehicle import VehicleListSerializer
from parking_management.serializers.parking.vehicle import VehicleDetailSelectSerializer
from core.views.common import BaseCommonViewSet

try:
    from core.constants.filters import VEHICLE_FILTER_FIELDS
except ImportError:
    VEHICLE_FILTER_FIELDS = {}


class VehicleViewSet(BaseCommonViewSet):
    """
    - GET /vehicle/         → 전체 목록 조회
    - GET /vehicle/{id}/    → 단건 조회
    - POST /vehicle/        → 생성
    - PUT /vehicle/{id}/    → 전체 수정
    - PATCH /vehicle/{id}/  → 부분 수정
    - DELETE /vehicle/{id}/ → 삭제
    """
    queryset = Vehicle.objects.all()
    FILTER_FIELDS = VEHICLE_FILTER_FIELDS
    list_serializer_class = VehicleListSerializer
    detail_serializer_class = VehicleDetailSelectSerializer

    # 일반 사용자는 화면이 하는 전환만 할 수 있다. 주차 유형은 판정(허용/무단)을 정하므로
    # 아무 값으로나 바꾸게 두면 무단 차량을 "거주"로 세탁할 수 있다(보안 리뷰). 삭제는 관리자.
    #   등록: 본인 차량(거주·방문) / 차주 없는 무단 접수(UnauthorizedForm)
    #   수정: 무단 차량 -> 본인 방문차(VehicleForm) / 본인 차량 차주 해제 -> 무단(VehicleDetail)
    #         / 바꾸는 것 없는 요청(복구)
    OWN_TYPES = ('거주주차', '방문주차')

    def can_create(self, me, data):
        user, ptype = requested(data, 'user'), requested(data, 'parking_type')
        if user is None:
            return ptype == '무단주차'
        return same(user, me) and ptype in self.OWN_TYPES

    def can_change(self, me, obj, data):
        if not data:
            return same(obj.user_id, me) or obj.parking_type == '무단주차'
        user = requested(data, 'user', obj.user_id)
        ptype = requested(data, 'parking_type', obj.parking_type)
        if obj.parking_type == '무단주차' and not same(obj.user_id, me):
            return same(user, me) and ptype == '방문주차'
        if not same(obj.user_id, me):
            return False
        unassign = user is None and ptype == '무단주차'
        keep_type = same(user, me) and ptype == obj.parking_type
        return unassign or keep_type
