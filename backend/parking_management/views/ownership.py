"""ViewSet 쓰기 규칙에서 쓰는 작은 판정 도우미."""
from typing import Any, Mapping

_MISSING = object()


def same(a: Any, b: Any) -> bool:
    return a is not None and str(a) == str(b)


def requested(data: Mapping, field: str, default: Any = None) -> Any:
    """요청이 field 를 바꾸려 하면 그 값, 아니면 default(현재 값). 빈 값은 None."""
    value = data.get(field, _MISSING) if hasattr(data, "get") else _MISSING
    if value is _MISSING:
        return default
    return value or None


def me_or_nobody(value: Any, me: str) -> bool:
    return value is None or same(value, me)
