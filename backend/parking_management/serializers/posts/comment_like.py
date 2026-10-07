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


class CommentLikeDetailSelectSerializer(SoftDeleteSerializer):
    comments = CommentParentSerializer(read_only=True, source='comment')
    users = UserProfileParentSerializer(read_only=True, source='user')

    class Meta:
        model = CommentLike
        fields = '__all__'
