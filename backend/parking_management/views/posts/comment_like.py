from parking_management.models.posts.comment_like import CommentLike
from parking_management.serializers.posts.comment_like import CommentLikeListSerializer
from parking_management.serializers.posts.comment_like import CommentLikeDetailSelectSerializer
from core.views.common import BaseCommonViewSet

try:
    from core.constants.filters import COMMENT_LIKE_FILTER_FIELDS
except ImportError:
    COMMENT_LIKE_FILTER_FIELDS = {}


class CommentLikeViewSet(BaseCommonViewSet):
    """
    - GET /comment-like/         → 전체 목록 조회
    - GET /comment-like/{id}/    → 단건 조회
    - POST /comment-like/        → 생성
    - PUT /comment-like/{id}/    → 전체 수정
    - PATCH /comment-like/{id}/  → 부분 수정
    - DELETE /comment-like/{id}/ → 삭제
    """
    queryset = CommentLike.objects.all()
    FILTER_FIELDS = COMMENT_LIKE_FILTER_FIELDS
    list_serializer_class = CommentLikeListSerializer
    detail_serializer_class = CommentLikeDetailSelectSerializer
