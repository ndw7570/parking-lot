"""처리 끝나고 30일 지난 신고 사진을 지운다(영구보관 제외). 서버 cron 에서 하루 한 번 부른다.

    docker compose exec backend python manage.py purge_report_photos
"""
from django.core.management.base import BaseCommand

from parking_management.report_photos import purge_expired


class Command(BaseCommand):
    help = "보관 기한이 지난 무단주차 신고 사진을 지운다 (P005-025)"

    def handle(self, *args, **options):
        self.stdout.write(f"지운 사진: {purge_expired()}장")
