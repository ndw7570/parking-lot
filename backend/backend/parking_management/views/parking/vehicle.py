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
