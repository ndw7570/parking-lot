from parking_management.models.parking.user_profile import UserProfile
from parking_management.serializers.parking.user_profile import UserProfileListSerializer
from parking_management.serializers.parking.user_profile import UserProfileDetailSelectSerializer
from core.views.common import BaseCommonViewSet

try:
    from core.constants.filters import USER_PROFILE_FILTER_FIELDS
except ImportError:
    USER_PROFILE_FILTER_FIELDS = {}


class UserProfileViewSet(BaseCommonViewSet):
    """
    - GET /user-profile/         → 전체 목록 조회
    - GET /user-profile/{id}/    → 단건 조회
    - POST /user-profile/        → 생성
    - PUT /user-profile/{id}/    → 전체 수정
    - PATCH /user-profile/{id}/  → 부분 수정
    - DELETE /user-profile/{id}/ → 삭제
    """
    queryset = UserProfile.objects.all()
    FILTER_FIELDS = USER_PROFILE_FILTER_FIELDS
    list_serializer_class = UserProfileListSerializer
    detail_serializer_class = UserProfileDetailSelectSerializer
