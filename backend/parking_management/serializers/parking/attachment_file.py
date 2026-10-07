from core.serializers.soft_exclusion import SoftDeleteSerializer, SoftWhitelistBaseSerializer
from parking_management.models.parking.attachment_file import AttachmentFile


class AttachmentFileListSerializer(SoftDeleteSerializer):
    class Meta:
        model = AttachmentFile
        fields = '__all__'


class AttachmentFileParentSerializer(SoftDeleteSerializer):
    class Meta:
        model = AttachmentFile
        fields = '__all__'


class AttachmentFileDetailSelectSerializer(SoftDeleteSerializer):
    class Meta:
        model = AttachmentFile
        fields = '__all__'
