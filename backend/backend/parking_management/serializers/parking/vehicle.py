from core.serializers.soft_exclusion import SoftDeleteSerializer, SoftWhitelistBaseSerializer
from parking_management.models.parking.vehicle import Vehicle
from parking_management.models.parking.user_profile import UserProfile


class UserProfileParentSerializer(SoftDeleteSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'


class VehicleListSerializer(SoftDeleteSerializer):
    class Meta:
        model = Vehicle
        fields = '__all__'


class VehicleParentSerializer(SoftDeleteSerializer):
    class Meta:
        model = Vehicle
        fields = '__all__'


class VehicleDetailSelectSerializer(SoftDeleteSerializer):
    users = UserProfileParentSerializer(read_only=True, source='user')

    class Meta:
        model = Vehicle
        fields = '__all__'
