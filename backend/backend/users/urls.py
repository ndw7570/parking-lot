# users/urls.py

from django.urls import path
from .views import MeView, RegisterView

from .views import MeView, RegisterView, ChangePasswordView

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("auth/password/", ChangePasswordView.as_view(), name="change-password"),
]