from core.serializers.soft_exclusion import SoftDeleteSerializer, SoftWhitelistBaseSerializer
from parking_management.models.posts.post_like import PostLike
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


class PostLikeListSerializer(SoftDeleteSerializer):
    class Meta:
        model = PostLike
        fields = '__all__'


class PostLikeDetailSelectSerializer(SoftDeleteSerializer):
    posts = PostParentSerializer(read_only=True, source='post')
    users = UserProfileParentSerializer(read_only=True, source='user')

    class Meta:
        model = PostLike
        fields = '__all__'
