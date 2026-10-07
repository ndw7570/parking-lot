from django.apps import AppConfig


class AppsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "parking_management"

    def ready(self):
        """앱 로드 시 초기화 동작 (signals 등)"""
        try:
            import accounts.signals  # noqa
        except ImportError:
            pass