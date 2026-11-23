"""API 오류의 공통 모양.

모든 오류 응답에 { "error": { "code": ..., "message": ... } } 를 싣는다. 화면은 code 로
상황에 맞는 문장을 고르고, message 는 사람이 읽을 기본 문장이다.

기존 화면이 읽는 DRF 필드 오류(`{"plate_number": ["..."]}`, `detail`)는 그대로 둔다 -
한꺼번에 바꾸면 그것을 읽는 화면이 모두 깨진다.

예상 못 한 예외(500)도 JSON 으로 돌려준다. 사용자 문장에는 내부 사정을 넣지 않고,
전체 내용은 로그(core.errors)에 남긴다.
"""
import logging

from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger("core.errors")


class AppError(APIException):
    """업무 규칙 위반. code 는 화면과의 약속이라 바꾸지 않는다."""

    status_code = status.HTTP_400_BAD_REQUEST
    code = "APP_ERROR"

    def __init__(self, message: str, code: str | None = None, status_code: int | None = None):
        super().__init__(detail=message)
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "CONFLICT"


# DRF 기본 예외 -> 코드
_CODES = {
    exceptions.ValidationError: "VALIDATION_ERROR",
    exceptions.ParseError: "VALIDATION_ERROR",
    exceptions.NotAuthenticated: "NOT_AUTHENTICATED",
    exceptions.AuthenticationFailed: "NOT_AUTHENTICATED",
    exceptions.PermissionDenied: "PERMISSION_DENIED",
    exceptions.NotFound: "NOT_FOUND",
    Http404: "NOT_FOUND",
    exceptions.MethodNotAllowed: "METHOD_NOT_ALLOWED",
    exceptions.Throttled: "RATE_LIMITED",
    exceptions.UnsupportedMediaType: "VALIDATION_ERROR",
}

_DEFAULT_MESSAGES = {
    "VALIDATION_ERROR": "입력값을 확인해 주세요.",
    "NOT_AUTHENTICATED": "로그인이 필요합니다.",
    "PERMISSION_DENIED": "이 작업을 할 권한이 없습니다.",
    "NOT_FOUND": "찾는 정보가 없습니다.",
    "METHOD_NOT_ALLOWED": "지원하지 않는 요청입니다.",
    "RATE_LIMITED": "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.",
    "SERVER_ERROR": "서버에서 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
}


def _code_of(exc) -> str:
    if isinstance(exc, AppError):
        return exc.code
    for cls, code in _CODES.items():
        if isinstance(exc, cls):
            return code
    return "ERROR"


def _first_message(data) -> str | None:
    """필드 오류 묶음에서 사람이 읽을 첫 문장."""
    if isinstance(data, str):
        return data
    if isinstance(data, list):
        for item in data:
            found = _first_message(item)
            if found:
                return found
    if isinstance(data, dict):
        for key in ("detail", "non_field_errors"):
            if key in data:
                found = _first_message(data[key])
                if found:
                    return found
        for value in data.values():
            found = _first_message(value)
            if found:
                return found
    return None


def api_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        # 예상 못 한 예외. 사용자에게는 일반 문장, 로그에는 전체 내용.
        view = context.get("view")
        logger.error("unhandled API error in %s", type(view).__name__ if view else "?", exc_info=exc)
        return Response(
            {"detail": _DEFAULT_MESSAGES["SERVER_ERROR"],
             "error": {"code": "SERVER_ERROR", "message": _DEFAULT_MESSAGES["SERVER_ERROR"]}},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    code = _code_of(exc)
    data = response.data
    message = (
        str(exc.detail) if isinstance(exc, AppError)
        else _DEFAULT_MESSAGES.get(code) if code in ("NOT_AUTHENTICATED", "PERMISSION_DENIED", "NOT_FOUND")
        else _first_message(data) or _DEFAULT_MESSAGES.get(code) or "요청을 처리하지 못했습니다."
    )
    if not isinstance(data, dict):
        data = {"detail": message}
    response.data = {**data, "error": {"code": code, "message": message}}
    return response
