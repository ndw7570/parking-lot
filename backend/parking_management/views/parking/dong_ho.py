from parking_management.models.parking.dong_ho import DongHo
from parking_management.serializers.parking.dong_ho import DongHoListSerializer
from parking_management.serializers.parking.dong_ho import DongHoDetailSelectSerializer
from core.views.common import BaseCommonViewSet

try:
    from core.constants.filters import DONG_HO_FILTER_FIELDS
except ImportError:
    DONG_HO_FILTER_FIELDS = {}


class DongHoViewSet(BaseCommonViewSet):
    """
    - GET /dong-ho/         → 전체 목록 조회
    - GET /dong-ho/{id}/    → 단건 조회
    - POST /dong-ho/        → 생성
    - PUT /dong-ho/{id}/    → 전체 수정
    - PATCH /dong-ho/{id}/  → 부분 수정
    - DELETE /dong-ho/{id}/ → 삭제
    """
    queryset = DongHo.objects.all()
    FILTER_FIELDS = DONG_HO_FILTER_FIELDS
    list_serializer_class = DongHoListSerializer
    detail_serializer_class = DongHoDetailSelectSerializer
