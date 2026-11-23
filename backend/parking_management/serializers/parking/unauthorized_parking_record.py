from core.serializers.soft_exclusion import SoftDeleteSerializer, SoftWhitelistBaseSerializer
from parking_management.models.parking.unauthorized_parking_record import UnauthorizedParkingRecord


class UnauthorizedParkingRecordListSerializer(SoftDeleteSerializer):
    class Meta:
        model = UnauthorizedParkingRecord
        fields = '__all__'
        # 처리자는 요청한 계정으로 서버가 채운다. 클라이언트 값은 받지 않는다.
        read_only_fields = ('processed_by',)


class UnauthorizedParkingRecordDetailSelectSerializer(SoftDeleteSerializer):
    class Meta:
        model = UnauthorizedParkingRecord
        fields = '__all__'
        # 처리자는 요청한 계정으로 서버가 채운다. 클라이언트 값은 받지 않는다.
        read_only_fields = ('processed_by',)
