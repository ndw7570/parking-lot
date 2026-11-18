from rest_framework.validators import UniqueTogetherValidator
from core.serializers.soft_exclusion import SoftDeleteSerializer, SoftWhitelistBaseSerializer
from parking_management.models.posts.comment_like import CommentLike
from parking_management.models.posts.comment import Comment
from parking_management.models.parking.user_profile import UserProfile


class CommentParentSerializer(SoftDeleteSerializer):
    class Meta:
        model = Comment
        fields = '__all__'


class UserProfileParentSerializer(SoftDeleteSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'


class CommentLikeListSerializer(SoftDeleteSerializer):
    class Meta:
        model = CommentLike
        fields = '__all__'
        # DB 제약이 조건부(삭제 안 된 행만)라 DRF 가 자동 검사를 만들지 않는다.
        # 기본 매니저가 살아 있는 행만 주므로 같은 규칙으로 중복을 400 으로 돌려준다.
        validators = [
            UniqueTogetherValidator(queryset=CommentLike.objects.all(), fields=['comment', 'user']),
        ]


class CommentLikeDetailSelectSerializer(SoftDeleteSerializer):
    comments = CommentParentSerializer(read_only=True, source='comment')
    users = UserProfileParentSerializer(read_only=True, source='user')

    class Meta:
        model = CommentLike
        fields = '__all__'
