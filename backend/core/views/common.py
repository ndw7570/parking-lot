from typing import Optional, Sequence
from django.db.models import QuerySet
from django.db.models import Q
from rest_framework.request import Request
from rest_framework import viewsets
from core.mixins.query_mixins import RetrieveDetailSwitchMixin
from core.mixins.pagination import PaginationMixin
from core.constants.filters import EXISTENCE_FILTER_FIELDS
from .response import success_response
from rest_framework.decorators import action
from rest_framework.settings import api_settings
from core.permissions import OwnerOrAdminWrite
from rest_framework.exceptions import ValidationError
from django.db import IntegrityError, transaction


class SoftDeleteViewSet(viewsets.ModelViewSet):
    """
    SoftDeleteModel을 위한 공용 ViewSet

    Query Parameters:
    - soft_delete_mode:
        - 'deleted': 삭제된 데이터만 조회
        - 'all': 삭제된 데이터 포함 전체 조회
        - (없음): 살아있는 데이터만 조회 (기본값)
    """
    request: Request

    def get_queryset(self):
        # 1. 기본 모델 클래스 가져오기
        # self.queryset이 정의되어 있어야 함 (예: Staff.objects.all())
        if self.queryset is None:
            raise NotImplementedError("queryset attribute must be set.")

        model_class = self.queryset.model
        mode = self.request.query_params.get('soft_delete_mode')

        # 2. 모드에 따른 초기 쿼리셋 결정
        if mode == 'deleted':
            qs = model_class.objects.deleted_only()
        elif mode == 'all':
            qs = model_class.objects.all_with_deleted()
        else:
            # 기본 동작: alive() 상태
            qs = model_class.objects.all()

        return qs

    @action(detail=True, methods=['patch'], url_path='restore')
    def restore(self, request, pk=None):
        model_class = self.queryset.model
        instance = model_class.objects.all_with_deleted().get(pk=pk)
        # get_object() 를 거치지 않으므로 객체 권한 검사를 직접 부른다. 빠지면 아무나 복구한다.
        self.check_object_permissions(request, instance)
        instance.is_deleted = False
        # 조건부 유일 제약(살아 있는 행끼리만 유일)이 있는 모델은 같은 값의 살아 있는 행이
        # 있으면 복구가 DB 에서 거절된다. 500 대신 이유를 400 으로 돌려준다.
        try:
            with transaction.atomic():
                instance.save(update_fields=['is_deleted'])
        except IntegrityError:
            raise ValidationError("같은 값의 데이터가 이미 있어 복구할 수 없습니다.")
        return success_response({'id': instance.pk}, 'Restored successfully.')

    def perform_create(self, serializer):
        serializer.save(is_deleted=False)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # serializer = self.get_serializer(instance)

        self.perform_destroy(instance)
        return success_response({'id': instance.pk}, 'Deleted successfully.')


class BaseCommonViewSet(PaginationMixin, RetrieveDetailSwitchMixin, SoftDeleteViewSet):
    """
    SoftDelete, 필터, list/retrieve별 serializer 및 prefetch/select 분기 공통 지원
    """
    # 읽기는 로그인만, 쓰기는 관리자 또는 아래 can_* 규칙(core/permissions.py).
    permission_classes = [*api_settings.DEFAULT_PERMISSION_CLASSES, OwnerOrAdminWrite]

    # 일반 사용자 쓰기 규칙. 기본은 전부 거절 = 관리자 전용. 리소스별 ViewSet 이 덮어쓴다.
    # me 는 로그인 아이디(= user_profile.user_id 가입 규칙), data 는 요청 본문이다.
    def can_create(self, me: str, data) -> bool:
        return False

    def can_change(self, me: str, obj, data) -> bool:
        return False

    def can_delete(self, me: str, obj) -> bool:
        return False

    FILTER_FIELDS = None
    list_serializer_class = None
    detail_serializer_class = None
    prefetch_detail = None  # ex: ('staffs', )
    select_detail = None  # ex: ('department', )
    # EXISTENCE_FILTER_FIELDS = None
    # EXISTENCE_FILTER_FIELDS: Sequence[str] = None

    # 🔹 각 ViewSet에서 덮어쓸 수 있는 정렬 기본값
    default_ordering: Optional[Sequence[str]] = None  # ex: ('country_code',)

    def paginate_queryset(self, queryset: QuerySet) -> Optional[list]:
        """
        DRF GenericAPIView 의 paginate_queryset을 오버라이드.
        실질적인 정책은 PaginationMixin.should_disable_pagination() 에서 관리.
        """
        if self.should_disable_pagination():
            return None
        # 여기서 super()는 SoftDeleteViewSet → ModelViewSet → GenericAPIView 로 이어짐
        # PyCharm도 이 체인은 인식 가능해서 경고 안 뜸
        return super().paginate_queryset(queryset)

    def apply_default_ordering(self, qs: QuerySet) -> QuerySet:
        """
        default_ordering 이 정의돼 있으면 이를 적용.
        (('code',) 또는 ['-created_at', 'id'] 같은 형태)
        """
        if self.default_ordering:
            # tuple/list 모두 지원
            return qs.order_by(*self.default_ordering)
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve' or self.should_use_detail():
            return self.detail_serializer_class or self.serializer_class
        return self.list_serializer_class or self.serializer_class

    def get_queryset(self):
        qs = super().get_queryset()
        filter_kwargs = self.get_filter_kwargs() if hasattr(self, 'get_filter_kwargs') else {}

        # 일반 filter 적용 전에 existence 전용 파라미터는 제거
        for param in EXISTENCE_FILTER_FIELDS.keys():
            filter_kwargs.pop(param, None)

        if filter_kwargs:
            qs = qs.filter(**filter_kwargs)

        # existence 필터 처리
        for param, field in EXISTENCE_FILTER_FIELDS.items():
            if param in self.request.query_params:
                value = self.request.query_params.get(param)

                if value in ('', 'true', 'True'):
                    qs = qs.filter(
                        Q(**{f"{field}": True}) | Q(**{field.replace('__isnull', ''): ''})
                    )
                    # ?is_null_company_email=false
                elif value in ('false', 'False'):
                    qs = qs.exclude(
                        Q(**{f"{field}": True}) | Q(**{field.replace('__isnull', ''): ''})
                    )

        # detail일 때 select_related 처리
        if (self.action == 'retrieve' or self.should_use_detail()) and self.select_detail:
            if isinstance(self.select_detail, (list, tuple)):
                qs = qs.select_related(*self.select_detail)
            else:
                qs = qs.select_related(self.select_detail)

        # detail일 때 prefetch_related 처리
        if (self.action == 'retrieve' or self.should_use_detail()) and self.prefetch_detail:
            if isinstance(self.prefetch_detail, (list, tuple)):
                for pf in self.prefetch_detail:
                    qs = qs.prefetch_related(pf)
            else:
                qs = qs.prefetch_related(self.prefetch_detail)

        # 마지막에 정렬 적용
        qs = self.apply_default_ordering(qs)

        return qs

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success_response(serializer.data)
        # return Response({
        #     "success": True,
        #     # "meta": {
        #     # },
        #     "results": serializer.data,
        # })
