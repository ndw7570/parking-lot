from rest_framework.request import Request
from core.pagination import Pagination


class PaginationMixin:
    """
       - pagination_class 기본값만 제공
       - 실제 paginate_queryset 오버라이드는 ViewSet(BaseCommonViewSet 등)에서 수행
       - 여기서는 '언제 페이지네이션을 끌지' 정책만 정의
       """

    pagination_class = Pagination
    pagination_disable_param = "no_page"  # GET ?no_page=1 이면 페이지네이션 끔

    def should_disable_pagination(self) -> bool:
        """
        공통 페이지네이션 비활성화 정책:
        - View 클래스에 disable_pagination = True 이면 무조건 끔
        - ?no_page=1 / true / yes / y / on 이면 해당 요청만 끔
        """
        # 1) View 단위 강제 OFF
        if getattr(self, "disable_pagination", False):
            return True

        # 2) 요청 단위 OFF
        request: Request = getattr(self, "request", None)
        if request is None:
            return False

        raw = request.query_params.get(self.pagination_disable_param)
        if raw is not None and str(raw).lower() in ("1", "true", "yes", "y", "on"):
            return True

        return False