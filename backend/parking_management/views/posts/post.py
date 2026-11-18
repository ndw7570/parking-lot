from parking_management.views.ownership import me_or_nobody, requested, same
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

    # 글은 누구나 쓰고, 작성자만 고치고 지운다. 작성자 없는 글은 관리자만.
    def can_create(self, me, data):
        return me_or_nobody(requested(data, 'user'), me)

    def can_change(self, me, obj, data):
        return same(obj.user_id, me) and same(requested(data, 'user', obj.user_id), me)

    def can_delete(self, me, obj):
        return same(obj.user_id, me)
