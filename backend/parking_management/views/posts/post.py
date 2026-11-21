from parking_management.views.ownership import me_or_nobody, requested, same
from parking_management.models.posts.post import Post
from parking_management.serializers.posts.post import PostListSerializer
from parking_management.serializers.posts.post import PostDetailSelectSerializer
from django.db.models import F
from django.utils import timezone

from core.views.common import BaseCommonViewSet
from parking_management.models.parking.user_profile import UserProfile

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

    # 화면은 작성자·날짜를 보내지 않는다. 비워 두면 목록에 "-" 로 나오고, 작성자 본인도
    # can_change 에 걸려 자기 글을 못 고친다. 서버가 로그인한 사람으로 채운다.
    # 거주민 프로필이 없는 계정(관리자 등)은 작성자를 비운다(FK 가 프로필을 가리킴).
    def perform_create(self, serializer):
        me = UserProfile.objects.filter(pk=self.request.user.get_username()).first()
        extra = {"created_at": timezone.localdate()}
        if serializer.validated_data.get("user") is None:
            extra["user"] = me
        serializer.save(is_deleted=False, **extra)
