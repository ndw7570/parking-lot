from core.serializers.soft_exclusion import SoftDeleteSerializer, SoftWhitelistBaseSerializer
from parking_management.models.parking.unauthorized_parking_record import UnauthorizedParkingRecord


class UnauthorizedParkingRecordListSerializer(SoftDeleteSerializer):
    class Meta:
        model = UnauthorizedParkingRecord
        fields = '__all__'


class UnauthorizedParkingRecordDetailSelectSerializer(SoftDeleteSerializer):
    class Meta:
        model = UnauthorizedParkingRecord
        fields = '__all__'
