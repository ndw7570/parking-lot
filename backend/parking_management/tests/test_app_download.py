"""P005-015: 로그인한 사람만 Android 앱(APK)을 받는다.

일반 링크는 토큰(Authorization 헤더)을 실을 수 없다. 그래서 로그인 상태로 5분짜리 서명 링크를
받고, 브라우저는 그 링크로 이동한다. 파일 전송은 nginx 가 한다(X-Accel-Redirect).
"""
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from parking_management.tests.factories import auth_client

LINK = "/api/app/android/link/"
DOWNLOAD = "/api/app/android/download/"


class AppDownloadLinkTests(TestCase):
    def test_anonymous_cannot_get_a_link(self):
        res = APIClient().post(LINK)

        self.assertEqual(res.status_code, 401, res.content)

    def test_signed_in_user_gets_a_download_url(self):
        res = auth_client().post(LINK)

        self.assertEqual(res.status_code, 200, res.content)
        self.assertTrue(res.json()["url"].startswith(DOWNLOAD + "?t="))


class AppDownloadTests(TestCase):
    def _url(self):
        return auth_client().post(LINK).json()["url"]

    def test_valid_link_hands_the_file_to_nginx(self):
        res = APIClient().get(self._url())

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["X-Accel-Redirect"], "/protected-downloads/parkingdesk.apk")
        self.assertEqual(res["Content-Type"], "application/vnd.android.package-archive")
        self.assertIn("attachment", res["Content-Disposition"])

    def test_missing_or_forged_token_is_rejected(self):
        self.assertEqual(APIClient().get(DOWNLOAD).status_code, 403)
        self.assertEqual(APIClient().get(DOWNLOAD, {"t": "forged"}).status_code, 403)

    def test_expired_link_is_rejected(self):
        url = self._url()

        with override_settings(APP_DOWNLOAD_LINK_MAX_AGE=-1):
            res = APIClient().get(url)

        self.assertEqual(res.status_code, 403)
