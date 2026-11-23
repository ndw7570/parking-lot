"""무단주차 사진 신고 (P005-025).

신고는 새 테이블이 아니라 무단주차 기록(UnauthorizedParkingRecord)에 붙는다 - 신고가 곧 접수라서.
같은 번호에 아직 출차 처리 안 된 기록이 있으면 새로 만들지 않고 그 기록에 합친다.

권한
- 신고·내 신고 보기: 로그인한 누구나(거주민 포함)
- 전체 신고 보기·상태 바꾸기·영구보관: 관리자(is_staff)
- 사진 보기: 관리자와 그 신고를 낸 사람(합쳐진 신고면 자기 사진을 올린 사람도)
DEBUG 에서 기본 권한이 AllowAny 로 풀려도 여기는 로그인을 요구한다 - 사진이 걸려 있어서.
"""
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import is_admin
from parking_management import report_photos
from parking_management.models.parking.unauthorized_parking_record import (
    REPORT_CHECKING,
    REPORT_DONE,
    REPORT_OPEN,
    REPORT_RECEIVED,
    REPORT_REJECTED,
    UnauthorizedParkingRecord,
    reporter_ids,
)

LOCATIONS = ("지상", "주차타워", "기타")
# 신고자에게 결과를 벨로 보여 주는 기간
RECENT_CLOSED_HOURS = 72


class ReportSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="vehicle_id", read_only=True)
    photos = serializers.SerializerMethodField()

    class Meta:
        model = UnauthorizedParkingRecord
        fields = (
            "id", "plate_number", "parking_location", "remarks", "parking_start_time", "parking_end_time",
            "report_status", "reported_by", "co_reporters", "report_count", "reject_reason", "closed_at", "photo_keep",
            "processed_by", "photos",
        )

    def get_photos(self, obj):
        me = self.context.get("me")
        admin = self.context.get("admin")
        out = []
        for att in report_photos.photos_of(obj.vehicle_id):
            # 다른 신고자의 사진은 신고자끼리 보이지 않는다(합쳐진 신고). 처음 신고자는 모두 본다.
            if admin or obj.reported_by == me or att.uploaded_by == me:
                out.append({"id": att.attachment_file_id, "uploaded_at": att.uploaded_at})
        return out


def _mine(me: str) -> Q:
    return Q(reported_by=me) | Q(co_reporters__contains=f"|{me}|")


def _clean_plate(value) -> str:
    plate = "".join(str(value or "").split()).upper()
    if not plate:
        raise ValidationError({"plate_number": ["차량번호를 입력해 주세요."]})
    if len(plate) > 20:
        raise ValidationError({"plate_number": ["차량번호가 너무 깁니다."]})
    return plate


class ReportViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    serializer_class = ReportSerializer
    queryset = UnauthorizedParkingRecord.objects.filter(report_status__isnull=False)

    def _me(self) -> str:
        return self.request.user.get_username()

    def _admin(self) -> bool:
        return is_admin(self.request.user)

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "me": self._me(), "admin": self._admin()}

    def get_queryset(self):
        qs = UnauthorizedParkingRecord.objects.filter(report_status__isnull=False).order_by("-parking_start_time", "-vehicle_id")
        if not self._admin() or self.request.query_params.get("mine"):
            qs = qs.filter(_mine(self._me()))
        status_param = self.request.query_params.get("status")
        if status_param == "open":
            qs = qs.filter(report_status__in=REPORT_OPEN)
        elif status_param == "closed":
            qs = qs.exclude(report_status__in=REPORT_OPEN)
        return qs

    def _get(self, pk) -> UnauthorizedParkingRecord:
        try:
            obj = UnauthorizedParkingRecord.objects.get(pk=pk, report_status__isnull=False)
        except (UnauthorizedParkingRecord.DoesNotExist, ValueError):
            raise Http404
        if not self._admin() and self._me() not in reporter_ids(obj):
            raise Http404  # 남의 신고는 있는지조차 알리지 않는다
        return obj

    def list(self, request):
        return Response(self.get_serializer(self.get_queryset(), many=True).data)

    def retrieve(self, request, pk=None):
        return Response(self.get_serializer(self._get(pk)).data)

    def create(self, request):
        me = self._me()
        plate = _clean_plate(request.data.get("plate_number"))
        location = request.data.get("parking_location") or "기타"
        if location not in LOCATIONS:
            raise ValidationError({"parking_location": ["위치는 지상 / 주차타워 / 기타 중 하나입니다."]})
        remarks = (request.data.get("remarks") or "").strip() or None
        photo = request.FILES.get("photo")
        now = timezone.now()

        recent = UnauthorizedParkingRecord.objects.all_with_deleted().filter(
            reported_by=me, parking_start_time__gte=now - timedelta(hours=1)
        ).count()
        recent_photos = report_photos.AttachmentFile.objects.filter(
            uploaded_by=me, uploaded_at__gte=now - timedelta(hours=1)
        ).count()
        if max(recent, recent_photos) >= settings.REPORT_HOURLY_LIMIT:
            raise ValidationError({"detail": "신고가 너무 잦습니다. 잠시 후 다시 해 주세요."})

        with transaction.atomic():
            # 같은 번호의 열린 기록(아직 출차 처리 전)이 있으면 거기에 합친다.
            record = (
                UnauthorizedParkingRecord.objects.select_for_update()
                .filter(plate_number=plate, parking_end_time__isnull=True)
                .order_by("vehicle_id")
                .first()
            )
            merged = record is not None
            if record is None:
                record = UnauthorizedParkingRecord.objects.create(
                    plate_number=plate,
                    parking_start_time=now,
                    parking_location=location,
                    remarks=remarks,
                    report_status=REPORT_RECEIVED,
                    reported_by=me,
                    report_count=1,
                    is_deleted=False,
                )
            else:
                if record.report_status is None:
                    # 관리자가 바로 접수한 기록에 첫 신고가 들어왔다.
                    record.report_status = REPORT_RECEIVED
                    record.reported_by = me
                    record.report_count = 1
                elif me not in reporter_ids(record):
                    # 같은 사람이 다시 신고하면 횟수는 그대로, 사진만 더한다.
                    record.report_count = (record.report_count or 0) + 1
                    record.co_reporters = f"{record.co_reporters or '|'}{me}|"
                if remarks:
                    record.remarks = f"{record.remarks}\n{remarks}" if record.remarks else remarks
                record.save()
            if photo:
                att = report_photos.save_photo(photo, record.vehicle_id, me)
                if record.attachment_file_id is None:
                    record.attachment_file_id = att.attachment_file_id
                    record.save(update_fields=["attachment_file_id"])

        data = self.get_serializer(record).data
        data["merged"] = merged
        return Response(data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        obj = self._get(pk)
        if not self._admin():
            raise PermissionDenied("신고 처리는 관리자만 합니다.")
        now = timezone.now()
        fields = []
        if "photo_keep" in request.data:
            keep = request.data.get("photo_keep")
            obj.photo_keep = keep in (True, "true", "True", "1", 1)
            fields.append("photo_keep")
        new_status = request.data.get("report_status")
        if new_status:
            if new_status not in (REPORT_RECEIVED, REPORT_CHECKING, REPORT_DONE, REPORT_REJECTED):
                raise ValidationError({"report_status": ["알 수 없는 상태입니다."]})
            if obj.report_status not in REPORT_OPEN and new_status != obj.report_status:
                raise ValidationError({"report_status": ["이미 끝난 신고입니다."]})
            if new_status == REPORT_REJECTED:
                reason = (request.data.get("reject_reason") or "").strip()
                if not reason:
                    raise ValidationError({"reject_reason": ["반려 사유를 적어 주세요."]})
                obj.reject_reason = reason
                fields.append("reject_reason")
            if new_status in (REPORT_DONE, REPORT_REJECTED) and obj.report_status in REPORT_OPEN:
                obj.closed_at = now
                fields.append("closed_at")
                # 끝난 신고는 무단주차 목록에서도 '종료'로 보이게 한다.
                if obj.parking_end_time is None:
                    obj.parking_end_time = now
                    obj.processed_by = self._me()
                    fields += ["parking_end_time", "processed_by"]
            obj.report_status = new_status
            fields.append("report_status")
        if fields:
            obj.save(update_fields=list(dict.fromkeys(fields)))
        return Response(self.get_serializer(obj).data)

    def destroy(self, request, pk=None):
        # 신고자는 아직 접수 상태일 때만 취소한다. 관리자는 기록을 지우지 않고 반려로 끝낸다.
        obj = self._get(pk)
        if obj.reported_by != self._me() or obj.report_status != REPORT_RECEIVED:
            raise PermissionDenied("접수 상태인 내 신고만 취소할 수 있습니다.")
        if obj.report_count and obj.report_count > 1:
            raise PermissionDenied("다른 사람도 신고한 건이라 취소할 수 없습니다.")
        for att in report_photos.photos_of(obj.vehicle_id):
            try:
                report_photos.photo_path(att).unlink(missing_ok=True)
            except FileNotFoundError:
                pass
            att.is_deleted = True
            att.save(update_fields=["is_deleted"])
        obj.is_deleted = True
        obj.save(update_fields=["is_deleted"])
        return Response({"id": obj.vehicle_id})

    @action(detail=True, methods=["get"], url_path=r"photo/(?P<att_id>\d+)")
    def photo(self, request, pk=None, att_id=None):
        obj = self._get(pk)
        att = report_photos.photos_of(obj.vehicle_id).filter(attachment_file_id=att_id).first()
        if att is None:
            raise Http404
        if not (self._admin() or obj.reported_by == self._me() or att.uploaded_by == self._me()):
            raise Http404
        try:
            fh = report_photos.photo_path(att).open("rb")
        except FileNotFoundError:
            raise Http404
        response = FileResponse(fh, content_type="image/jpeg")
        response["Cache-Control"] = "private, no-store"
        return response

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """벨·홈 카드용 숫자. 앱이 30초마다 부른다."""
        me = self._me()
        since = timezone.now() - timedelta(hours=RECENT_CLOSED_HOURS)
        base = UnauthorizedParkingRecord.objects.filter(report_status__isnull=False)
        mine_closed = base.filter(_mine(me), closed_at__gte=since).order_by("-closed_at")
        return Response({
            "is_admin": self._admin(),
            "new": base.filter(report_status=REPORT_RECEIVED).count() if self._admin() else 0,
            "open": base.filter(report_status__in=REPORT_OPEN).count() if self._admin() else 0,
            "mine_closed": [
                {"id": r.vehicle_id, "plate_number": r.plate_number, "report_status": r.report_status,
                 "reject_reason": r.reject_reason, "closed_at": r.closed_at}
                for r in mine_closed[:20]
            ],
        })
