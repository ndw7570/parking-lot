"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from django.urls import path
from rest_framework.permissions import AllowAny
from users.views import RegisterView
from core.views.app_download import AndroidAppLinkView, android_app_download

urlpatterns = [
    path("admin", admin.site.urls),
    path("api/parking", include("parking_management.urls"),),

    # Users
    path("users/", include("users.urls")),
    # 로그인한 사람만 Android 앱(APK)을 받는다 (P005-015). 파일 전송은 nginx(X-Accel-Redirect).
    path("api/app/android/link/", AndroidAppLinkView.as_view(), name="android_app_link"),
    path("api/app/android/download/", android_app_download, name="android_app_download"),
    path("users/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("users/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("users/auth/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("users/auth/register/", RegisterView.as_view(), name="user_register"),

    # OpenAPI 스키마(JSON)
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    # Swagger UI
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # Redoc
    path("redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]