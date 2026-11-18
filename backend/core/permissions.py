"""쓰기 권한: 관리자는 모두, 그 밖에는 ViewSet 이 선언한 "본인 데이터" 규칙만.

관리자는 계정 플래그(is_staff / is_superuser)로만 판정한다. 아이디 문자열로 판정하면
가입할 때 아이디에 "관리자"를 넣는 것만으로 관리자가 된다(P005-004).

규칙을 선언하지 않은 ViewSet 은 관리자만 쓸 수 있다. 새 리소스가 실수로 열리지 않게
기본을 닫아 둔다.
"""
from django.conf import settings
from rest_framework.permissions import SAFE_METHODS, BasePermission


def is_admin(user) -> bool:
    return bool(user and user.is_authenticated and (user.is_staff or user.is_superuser))


class OwnerOrAdminWrite(BasePermission):
    message = "이 데이터를 바꿀 권한이 없습니다."

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS or settings.DEBUG or is_admin(request.user):
            return True
        if view.action == "create":
            return view.can_create(request.user.get_username(), request.data)
        # 객체 단위 판단은 has_object_permission 에서 한다.
        return True

    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in SAFE_METHODS or settings.DEBUG or is_admin(request.user):
            return True
        me = request.user.get_username()
        if view.action == "destroy":
            return view.can_delete(me, obj)
        return view.can_change(me, obj, request.data)
