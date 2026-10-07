from core.serializers.soft_exclusion import SoftDeleteSerializer, SoftWhitelistBaseSerializer
from parking_management.models.posts.post import Post
from parking_management.models.parking.user_profile import UserProfile


class UserProfileParentSerializer(SoftDeleteSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'


class PostListSerializer(SoftDeleteSerializer):
    class Meta:
        model = Post
        fields = '__all__'


class PostParentSerializer(SoftDeleteSerializer):
    class Meta:
        model = Post
        fields = '__all__'


class PostDetailSelectSerializer(SoftDeleteSerializer):
    users = UserProfileParentSerializer(read_only=True, source='user')

    class Meta:
        model = Post
        fields = '__all__'
