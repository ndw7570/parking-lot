from parking_management.views.ownership import me_or_nobody, requested, same
from parking_management.models.posts.comment import Comment
from parking_management.models.posts.post import Post
from parking_management.serializers.posts.comment import CommentListSerializer
from parking_management.serializers.posts.comment import CommentDetailSelectSerializer
from django.db.models import F, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from core.views.common import BaseCommonViewSet
from parking_management.models.parking.user_profile import UserProfile

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

    # 댓글은 누구나 쓰고, 작성자만 고치고 지운다. 작성자 없는 댓글은 관리자만.
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
        comment = serializer.save(is_deleted=False, **extra)
        # 목록의 댓글 수는 글의 comment_count 를 그대로 쓴다. 쓸 때마다 같이 맞춘다.
        if comment.post_id:
            Post.objects.filter(pk=comment.post_id).update(comment_count=Coalesce(F("comment_count"), Value(0)) + 1)

    def perform_destroy(self, instance):
        was_alive = not instance.is_deleted
        super().perform_destroy(instance)
        if was_alive and instance.post_id:
            Post.objects.filter(pk=instance.post_id, comment_count__gt=0).update(comment_count=F("comment_count") - 1)
