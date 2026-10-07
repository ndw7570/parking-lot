from core.serializers.soft_exclusion import SoftDeleteSerializer, SoftWhitelistBaseSerializer
from parking_management.models.posts.comment import Comment
from parking_management.models.posts.post import Post
from parking_management.models.parking.user_profile import UserProfile


class PostParentSerializer(SoftDeleteSerializer):
    class Meta:
        model = Post
        fields = '__all__'


class UserProfileParentSerializer(SoftDeleteSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'


class CommentParentSerializer(SoftDeleteSerializer):
    class Meta:
        model = Comment
        fields = '__all__'


class CommentListSerializer(SoftDeleteSerializer):
    class Meta:
        model = Comment
        fields = '__all__'


class CommentDetailSelectSerializer(SoftDeleteSerializer):
    posts = PostParentSerializer(read_only=True, source='post')
    users = UserProfileParentSerializer(read_only=True, source='user')
    parents = CommentParentSerializer(read_only=True, source='parent')
    replies = CommentParentSerializer(read_only=True, many=True)

    class Meta:
        model = Comment
        fields = '__all__'
