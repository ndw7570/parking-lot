from django.db import models
from core.models.common import SoftDeleteModel


class AttachmentFile(SoftDeleteModel):
    """첨부파일"""
    attachment_file_id = models.AutoField(primary_key=True, db_comment="첨부파일ID")
    attachment_table = models.CharField(max_length=200, null=False, blank=True, db_comment="첨부테이블")
    search_id = models.IntegerField(null=False, blank=True, db_comment="조회ID")
    file_url = models.TextField(null=False, blank=True, db_comment="파일URL")
    file_name = models.CharField(max_length=200, null=False, blank=True, db_comment="원본파일명")
    file_size = models.IntegerField(null=False, blank=True, db_comment="파일크기")
    mime_type = models.CharField(max_length=100, null=False, blank=True, db_comment="MIME종류")
    sort_order = models.IntegerField(null=True, blank=True, db_comment="정렬순서")
    created_at = models.DateField(null=True, blank=True, db_comment="생성일")
    updated_at = models.DateField(null=True, blank=True, db_comment="수정일")
    remarks = models.TextField(null=True, blank=True, db_comment="비고")
    # 신고 사진(P005-025): 누가 언제 올렸나. 보관 기한·남용 제한에 쓴다.
    uploaded_by = models.CharField(max_length=200, null=True, blank=True, db_comment="올린 사람 아이디")
    uploaded_at = models.DateTimeField(null=True, blank=True, db_comment="올린 시각")
    is_deleted = models.BooleanField(null=False, blank=True, db_comment="삭제여부")

    class Meta:
        db_table = '"parking_lot"."attachment_files"'

    def __str__(self):
        return self.file_name or str(self.attachment_file_id)
