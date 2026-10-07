from core.serializers.soft_exclusion import SoftDeleteSerializer, SoftWhitelistBaseSerializer
from parking_management.models.parking.dong_ho import DongHo
from parking_management.models.parking.user_profile import UserProfile


class UserProfileParentSerializer(SoftDeleteSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'


class DongHoListSerializer(SoftDeleteSerializer):
    class Meta:
        model = DongHo
        fields = '__all__'


class DongHoParentSerializer(SoftDeleteSerializer):
    class Meta:
        model = DongHo
        fields = '__all__'


class DongHoDetailSelectSerializer(SoftDeleteSerializer):
    users = UserProfileParentSerializer(read_only=True, source='user')

    class Meta:
        model = DongHo
        fields = '__all__'
