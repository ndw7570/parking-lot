from parking_management.views.ownership import me_or_nobody, requested, same
from parking_management.models.parking.dong_ho import DongHo
from parking_management.serializers.parking.dong_ho import DongHoListSerializer
from parking_management.serializers.parking.dong_ho import DongHoDetailSelectSerializer
from rest_framework.exceptions import ValidationError

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

    # 한 사람은 한 세대에만 산다(FR-5.5). 화면 검사만으로는 다른 세대 등록 화면에서 뚫려
    # 같은 사람이 두 세대에 동시에 연결됐다. 옮길 때는 먼저 이전 세대를 비운다.
    def _check_single_home(self, user, current=None):
        if user is None:
            return
        others = DongHo.objects.filter(user=user, is_deleted=False)
        if current is not None:
            others = others.exclude(pk=current.pk)
        taken = others.first()
        if taken:
            raise ValidationError({"user": [f"이미 {taken.dong_ho_name}에 연결된 거주민입니다. 그 세대를 먼저 비워 주세요."]})

    def perform_create(self, serializer):
        self._check_single_home(serializer.validated_data.get("user"))
        super().perform_create(serializer)

    def perform_update(self, serializer):
        if "user" in serializer.validated_data:
            self._check_single_home(serializer.validated_data["user"], serializer.instance)
        super().perform_update(serializer)
