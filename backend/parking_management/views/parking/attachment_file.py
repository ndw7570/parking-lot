from parking_management.models.parking.attachment_file import AttachmentFile
from parking_management.serializers.parking.attachment_file import AttachmentFileListSerializer
from parking_management.serializers.parking.attachment_file import AttachmentFileDetailSelectSerializer
from core.views.common import BaseCommonViewSet

try:
    from core.constants.filters import ATTACHMENT_FILE_FILTER_FIELDS
except ImportError:
    ATTACHMENT_FILE_FILTER_FIELDS = {}


class AttachmentFileViewSet(BaseCommonViewSet):
    """
    - GET /attachment-file/         → 전체 목록 조회
    - GET /attachment-file/{id}/    → 단건 조회
    - POST /attachment-file/        → 생성
    - PUT /attachment-file/{id}/    → 전체 수정
    - PATCH /attachment-file/{id}/  → 부분 수정
    - DELETE /attachment-file/{id}/ → 삭제
    """
    queryset = AttachmentFile.objects.all()
    FILTER_FIELDS = ATTACHMENT_FILE_FILTER_FIELDS
    list_serializer_class = AttachmentFileListSerializer
    detail_serializer_class = AttachmentFileDetailSelectSerializer
