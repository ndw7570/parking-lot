from typing import Any, Dict
from rest_framework.request import Request
from rest_framework.viewsets import ViewSetMixin
from rest_framework.exceptions import ValidationError
from core.constants.filters import EXCLUDE_FROM_STRICT_CHECK

class RetrieveDetailSwitchMixin:
    """
    - self.FILTER_FIELDS 를 보고 검색 여부 판단
    - self.action 을 보고 retrieve 여부 판단
    """
    request: Request
    action: ViewSetMixin
    FILTER_FIELDS: dict = {}
    STRICT_QUERY_PARAMS: bool = True # 기본은 False 권장 (유연성)

    # 페이징, 정렬 등 DRF 기본 파라미터는 에러 검사에서 제외해야 함
    EXCLUDE_FROM_STRICT_CHECK = EXCLUDE_FROM_STRICT_CHECK

    # 파라미터가 있을 경우, 무조건 단건 상세 조회
    def should_use_detail(self) -> bool:
        is_searching = any(
            param in self.request.query_params for param in self.FILTER_FIELDS
        )
        return self.action == 'retrieve' or is_searching

    def get_filter_kwargs(self) -> Dict[str, Any]:
        request: Request = self.request
        query_params = request.query_params

        if self.STRICT_QUERY_PARAMS:
            input_keys = set(query_params.keys())
            allowed_keys = set(self.FILTER_FIELDS.keys()) | self.EXCLUDE_FROM_STRICT_CHECK

            unknown_keys = input_keys - allowed_keys
            if unknown_keys:
                raise ValidationError(f"허용되지 않은 검색 조건입니다: {', '.join(unknown_keys)}")

        result = {}
        for param, lookup in self.FILTER_FIELDS.items():
            if isinstance(lookup, str) and lookup.endswith('__in'):
                values = request.query_params.getlist(param)
                if values:
                    result[lookup] = values
            elif isinstance(lookup, str):
                value = request.query_params.get(param)
                if value:
                    if lookup.endswith('__isnull'):
                        value = value.lower() == 'true'
                    result[lookup] = value
        return result