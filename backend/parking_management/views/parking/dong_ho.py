from parking_management.views.ownership import me_or_nobody, requested, same
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

    # 빈 세대에는 본인만 들어갈 수 있고, 현재 거주민은 넘기거나 비울 수 있다(ResidentLinkPage).
    def can_create(self, me, data):
        return me_or_nobody(requested(data, 'user'), me)

    def can_change(self, me, obj, data):
        if same(obj.user_id, me):
            return True
        return obj.user_id is None and me_or_nobody(requested(data, 'user'), me)
