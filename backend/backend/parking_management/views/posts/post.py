from parking_management.models.posts.post import Post
from parking_management.serializers.posts.post import PostListSerializer
from parking_management.serializers.posts.post import PostDetailSelectSerializer
from core.views.common import BaseCommonViewSet

try:
    from core.constants.filters import POST_FILTER_FIELDS
except ImportError:
    POST_FILTER_FIELDS = {}


class PostViewSet(BaseCommonViewSet):
    """
    - GET /post/         → 전체 목록 조회
    - GET /post/{id}/    → 단건 조회
    - POST /post/        → 생성
    - PUT /post/{id}/    → 전체 수정
    - PATCH /post/{id}/  → 부분 수정
    - DELETE /post/{id}/ → 삭제
    """
    queryset = Post.objects.all()
    FILTER_FIELDS = POST_FILTER_FIELDS
    list_serializer_class = PostListSerializer
    detail_serializer_class = PostDetailSelectSerializer
