from parking_management.views.ownership import me_or_nobody, requested, same
from parking_management.models.posts.post_like import PostLike
from parking_management.serializers.posts.post_like import PostLikeListSerializer
from parking_management.serializers.posts.post_like import PostLikeDetailSelectSerializer
from core.views.common import BaseCommonViewSet

try:
    from core.constants.filters import POST_LIKE_FILTER_FIELDS
except ImportError:
    POST_LIKE_FILTER_FIELDS = {}


class PostLikeViewSet(BaseCommonViewSet):
    """
    - GET /post-like/         → 전체 목록 조회
    - GET /post-like/{id}/    → 단건 조회
    - POST /post-like/        → 생성
    - PUT /post-like/{id}/    → 전체 수정
    - PATCH /post-like/{id}/  → 부분 수정
    - DELETE /post-like/{id}/ → 삭제
    """
    queryset = PostLike.objects.all()
    FILTER_FIELDS = POST_LIKE_FILTER_FIELDS
    list_serializer_class = PostLikeListSerializer
    detail_serializer_class = PostLikeDetailSelectSerializer

    # 좋아요는 본인 이름으로만 누르고 취소한다.
    def can_create(self, me, data):
        return same(requested(data, 'user'), me)

    def can_delete(self, me, obj):
        return same(obj.user_id, me)
