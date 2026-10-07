from core.serializers.soft_exclusion import SoftDeleteSerializer, SoftWhitelistBaseSerializer
from parking_management.models.parking.user_profile import UserProfile


class UserProfileListSerializer(SoftDeleteSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'


class UserProfileParentSerializer(SoftDeleteSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'


class UserProfileDetailSelectSerializer(SoftDeleteSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'
