"""무단주차 신고 사진 저장·삭제 (P005-025).

사진은 JPEG 만 받는다. 화면이 올리기 전에 줄여서 JPEG 로 다시 저장하므로 보통은 이미
메타데이터가 없다. 그래도 서버에서 한 번 더 APP1~APP15·주석 구간을 지운다 - 촬영 위치(GPS)는
EXIF(APP1)에 들어 있어서, 화면을 거치지 않은 요청이 와도 위치가 남지 않게 하려는 것이다.
Pillow 를 들이지 않으려고 JPEG 구간만 직접 걷어 낸다(그림 데이터는 건드리지 않는다).
"""
import uuid
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from parking_management.models.parking.attachment_file import AttachmentFile

TABLE = "unauthorized_parking_records"
SUBDIR = "reports"

_SOI = b"\xff\xd8"
_SOS = 0xDA
_EOI = 0xD9
# 길이 없이 표시만 있는 마커
_STANDALONE = {0x01, *range(0xD0, 0xD8)}
# 지울 구간: APP1~APP15(EXIF·XMP·ICC 등), COM(주석). APP0(JFIF)은 그림 해석에 필요할 수 있어 둔다.
_DROP = {*range(0xE1, 0xF0), 0xFE}


def strip_jpeg_metadata(data: bytes) -> bytes:
    if not data.startswith(_SOI):
        raise ValidationError({"photo": ["JPEG 사진만 올릴 수 있습니다."]})
    out = bytearray(_SOI)
    i = 2
    n = len(data)
    while i < n:
        if data[i] != 0xFF:
            raise ValidationError({"photo": ["사진 파일이 손상되었습니다."]})
        marker = data[i + 1] if i + 1 < n else None
        if marker is None:
            break
        if marker == 0xFF:  # 채움 바이트
            i += 1
            continue
        if marker in _STANDALONE:
            out += data[i:i + 2]
            i += 2
            continue
        if marker == _EOI:
            out += data[i:i + 2]
            return bytes(out)
        if i + 4 > n:
            raise ValidationError({"photo": ["사진 파일이 손상되었습니다."]})
        length = int.from_bytes(data[i + 2:i + 4], "big")
        end = i + 2 + length
        if length < 2 or end > n:
            raise ValidationError({"photo": ["사진 파일이 손상되었습니다."]})
        if marker == _SOS:
            # 여기부터는 그림 데이터. 끝까지 그대로 붙인다.
            out += data[i:]
            return bytes(out)
        if marker not in _DROP:
            out += data[i:end]
        i = end
    return bytes(out)


def _root() -> Path:
    return Path(settings.REPORT_PHOTO_ROOT)


def save_photo(upload, record_id: int, uploader: str) -> AttachmentFile:
    if upload.size > settings.REPORT_PHOTO_MAX_BYTES:
        mb = settings.REPORT_PHOTO_MAX_BYTES // (1024 * 1024)
        raise ValidationError({"photo": [f"사진은 {mb}MB 이하만 올릴 수 있습니다."]})
    clean = strip_jpeg_metadata(upload.read())
    rel = f"{SUBDIR}/{uuid.uuid4().hex}.jpg"
    path = _root() / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(clean)
    now = timezone.now()
    return AttachmentFile.objects.create(
        attachment_table=TABLE,
        search_id=record_id,
        file_url=rel,
        file_name="report.jpg",
        file_size=len(clean),
        mime_type="image/jpeg",
        created_at=timezone.localdate(),
        uploaded_by=uploader,
        uploaded_at=now,
        is_deleted=False,
    )


def photos_of(record_id: int):
    return AttachmentFile.objects.filter(attachment_table=TABLE, search_id=record_id).order_by("attachment_file_id")


def photo_path(att: AttachmentFile) -> Path:
    path = (_root() / att.file_url).resolve()
    # file_url 은 서버가 만든 값이지만, DB 가 바뀌어도 사진 폴더 밖은 읽지 않는다.
    if _root().resolve() not in path.parents:
        raise FileNotFoundError(att.file_url)
    return path


def purge_expired(now=None) -> int:
    """처리 끝나고 보관 기한이 지난 신고의 사진을 지운다. 영구보관은 남긴다. 지운 장수를 돌려준다."""
    from parking_management.models.parking.unauthorized_parking_record import UnauthorizedParkingRecord

    now = now or timezone.now()
    limit = now - timedelta(days=settings.REPORT_PHOTO_KEEP_DAYS)
    expired_ids = UnauthorizedParkingRecord.objects.all_with_deleted().filter(
        closed_at__isnull=False, closed_at__lt=limit, photo_keep=False
    ).values_list("vehicle_id", flat=True)
    removed = 0
    for att in AttachmentFile.objects.filter(attachment_table=TABLE, search_id__in=list(expired_ids)):
        try:
            photo_path(att).unlink(missing_ok=True)
        except FileNotFoundError:
            pass
        # 기록(누가 언제 올렸나)은 남기고 파일만 지운다.
        att.is_deleted = True
        att.save(update_fields=["is_deleted"])
        removed += 1
    return removed
