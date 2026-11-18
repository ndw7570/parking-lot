"""로그인한 사람만 Android 앱(APK)을 받는다 (P005-015).

브라우저의 일반 다운로드 링크는 Authorization 헤더(JWT)를 실을 수 없다. 그래서
1) 로그인 상태로 링크를 요청하면 짧게 유효한 서명 링크를 주고
2) 브라우저는 그 링크로 이동한다. 서명이 맞으면 nginx 에게 파일 전송을 넘긴다(X-Accel-Redirect).
파일 자체는 nginx 의 internal 경로에만 있어 링크 없이 직접 받을 수 없다.
"""
from urllib.parse import urlencode

from django.conf import settings
from django.core import signing
from django.http import HttpResponse
from django.views.decorators.http import require_GET
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

_SALT = "app-download.android"
_DOWNLOAD_PATH = "/api/app/android/download/"
_APK_MIME = "application/vnd.android.package-archive"


def _signer() -> signing.TimestampSigner:
    return signing.TimestampSigner(salt=_SALT)


class AndroidAppLinkView(APIView):
    # DEBUG 에서 기본 권한이 AllowAny 로 풀려도 이 링크는 로그인을 요구한다.
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        token = _signer().sign(request.user.get_username())
        return Response({
            "url": f"{_DOWNLOAD_PATH}?{urlencode({'t': token})}",
            "expires_in": settings.APP_DOWNLOAD_LINK_MAX_AGE,
        })


@require_GET
def android_app_download(request) -> HttpResponse:
    try:
        _signer().unsign(request.GET.get("t", ""), max_age=settings.APP_DOWNLOAD_LINK_MAX_AGE)
    except signing.BadSignature:  # 만료(SignatureExpired)도 여기로 온다
        return HttpResponse("다운로드 링크가 만료되었거나 올바르지 않습니다. 앱에서 다시 받아 주세요.",
                            status=403, content_type="text/plain; charset=utf-8")
    response = HttpResponse(content_type=_APK_MIME)
    response["X-Accel-Redirect"] = f"/protected-downloads/{settings.APP_DOWNLOAD_ANDROID_FILE}"
    # 첨부(Content-Disposition) 헤더는 nginx 가 파일이 있을 때만 붙인다. 여기서 붙이면 파일이 없을 때
    # 404 응답에도 따라가, 폰 브라우저가 오류 문구 대신 "사이트에 연결할 수 없음"을 띄운다.
    response["Cache-Control"] = "no-store"
    return response
