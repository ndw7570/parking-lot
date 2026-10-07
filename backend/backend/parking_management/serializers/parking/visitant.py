from django.utils import timezone
from rest_framework import serializers
from core.serializers.soft_exclusion import SoftDeleteSerializer
from parking_management.models.parking.visitant import Visitant
from parking_management.models.parking.user_profile import UserProfile
from parking_management.models.parking.vehicle import Vehicle


class UserProfileParentSerializer(SoftDeleteSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'


class VehicleParentSerializer(SoftDeleteSerializer):
    class Meta:
        model = Vehicle
        fields = '__all__'


class VisitantListSerializer(SoftDeleteSerializer):
    class Meta:
        model = Visitant
        fields = '__all__'


class VisitantDetailSelectSerializer(SoftDeleteSerializer):
    users = UserProfileParentSerializer(read_only=True, source='user')
    vehicles = VehicleParentSerializer(read_only=True, source='vehicle')

    class Meta:
        model = Visitant
        fields = '__all__'

class VisitantCreateSerializer(SoftDeleteSerializer):
    parking_start_time = serializers.DateTimeField(read_only=True)
    parking_end_time = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Visitant
        fields = '__all__'

    def validate_valid_hours(self, value):
        if value not in (6, 12, 24):
            raise serializers.ValidationError("가능시간은 6, 12, 24 중 하나여야 합니다.")
        return value

    def validate(self, attrs):
        vehicle = attrs.get('vehicle')
        # update(PATCH)일 때 vehicle이 안 넘어오면 기존 인스턴스에서 가져옴: "memo"값 하나만 바뀌면 vehicle값도 안 넘어오므로
        if not vehicle and self.instance:
            vehicle = self.instance.vehicle

        if vehicle:
            now = timezone.now()
            active = Visitant.objects.filter(
                vehicle=vehicle,
                is_deleted=False,
                parking_end_time__gt=now, # __gt는 greater than, 즉 > 를 의미해.
            )
            # update 시 자기 자신은 제외: 수정할 때 자기 자신은 중복 검사 대상에서 빼는 코드
            if self.instance:
                active = active.exclude(pk=self.instance.pk)

            conflict = active.exists()
            if conflict:
                remaining = conflict.parking_end_time - now
                if remaining.total_seconds() > 30 * 60:
                    raise serializers.ValidationError(
                        f"해당 차량에 활성 방문권이 있습니다. "
                        f"출차 30분 전부터 재발급 가능합니다. "
                        f"(만료: {conflict.parking_end_time.isoformat()})"
                    )
        return attrs