from datetime import timedelta
from django.utils import timezone
from parking_management.models.parking.visitant import Visitant
from parking_management.serializers.parking.visitant import (
    VisitantListSerializer,
    VisitantDetailSelectSerializer,
    VisitantCreateSerializer
)
from core.views.common import BaseCommonViewSet

try:
    from core.constants.filters import VISITANT_FILTER_FIELDS
except ImportError:
    VISITANT_FILTER_FIELDS = {}

try:
    from core.constants.filters import VISITANT_FILTER_FIELDS
except ImportError:
    VISITANT_FILTER_FIELDS = {}

class VisitantViewSet(BaseCommonViewSet):
    """
    - GET /visitant/         → 전체 목록 조회
    - GET /visitant/{id}/    → 단건 조회
    - POST /visitant/        → 생성
    - PUT /visitant/{id}/    → 전체 수정
    - PATCH /visitant/{id}/  → 부분 수정
    - DELETE /visitant/{id}/ → 삭제
    """
    queryset = Visitant.objects.all()
    FILTER_FIELDS = VISITANT_FILTER_FIELDS
    list_serializer_class = VisitantListSerializer
    detail_serializer_class = VisitantDetailSelectSerializer

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return VisitantCreateSerializer
        return super().get_serializer_class()

    def perform_create(self, serializer):
        now = timezone.now()
        valid_hours = serializer.validated_data['valid_hours']
        serializer.save(
            is_deleted=False,
            parking_start_time=now,
            parking_end_time=now + timedelta(hours=valid_hours),
        )

    def perform_update(self, serializer):
        valid_hours = serializer.validated_data.get('valid_hours')
        if valid_hours:
            now = timezone.now()
            serializer.save(
                parking_start_time=now,
                parking_end_time=now + timedelta(hours=valid_hours),
            )
        else:
            serializer.save()

# 장고 ViewSet 내부 흐름
# def create(self, request, *args, **kwargs):
#     serializer = self.get_serializer(data=request.data)
#     serializer.is_valid(raise_exception=True)
#     self.perform_create(serializer)
#     return Response(serializer.data)