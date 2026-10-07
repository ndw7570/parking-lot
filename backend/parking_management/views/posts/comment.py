from parking_management.models.posts.comment import Comment
from parking_management.serializers.posts.comment import CommentListSerializer
from parking_management.serializers.posts.comment import CommentDetailSelectSerializer
from core.views.common import BaseCommonViewSet

try:
    from core.constants.filters import COMMENT_FILTER_FIELDS
except ImportError:
    COMMENT_FILTER_FIELDS = {}


class CommentViewSet(BaseCommonViewSet):
    """
    - GET /comment/         → 전체 목록 조회
    - GET /comment/{id}/    → 단건 조회
    - POST /comment/        → 생성
    - PUT /comment/{id}/    → 전체 수정
    - PATCH /comment/{id}/  → 부분 수정
    - DELETE /comment/{id}/ → 삭제
    """
    queryset = Comment.objects.all()
    FILTER_FIELDS = COMMENT_FILTER_FIELDS
    list_serializer_class = CommentListSerializer
    detail_serializer_class = CommentDetailSelectSerializer
