from django.db import models
from parking_management.models.parking.user_profile import UserProfile
from core.models.common import SoftDeleteModel


class Post(SoftDeleteModel):
    """게시글"""
    posts_id = models.AutoField(primary_key=True, db_comment="게시글ID")
    posts_type = models.CharField(max_length=20, null=True, blank=True, db_comment="게시판유형")
    sort_order = models.IntegerField(null=True, blank=True, db_comment="노출순서")
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="user_id",
        related_name="posts",
        db_comment="유저ID",
    )
    title = models.CharField(max_length=200, null=True, blank=True, db_comment="제목")
    content = models.TextField(null=True, blank=True, db_comment="본문")
    is_pinned = models.BooleanField(null=False, blank=True, db_comment="상단고정여부")
    view_count = models.IntegerField(null=True, blank=True, db_comment="조회수")
    comment_count = models.IntegerField(null=True, blank=True, db_comment="댓글수")
    like_count = models.IntegerField(null=True, blank=True, db_comment="좋아요수")
    attachment_file_id = models.IntegerField(null=True, blank=True, db_comment="첨부파일ID")
    created_at = models.DateField(null=True, blank=True, db_comment="생성일")
    updated_at = models.DateField(null=True, blank=True, db_comment="수정일")
    deleted_at = models.DateField(null=True, blank=True, db_comment="삭제일")
    remarks = models.TextField(null=True, blank=True, db_comment="비고")
    is_deleted = models.BooleanField(null=False, blank=True, db_comment="삭제여부")

    class Meta:
        db_table = '"parking_lot"."posts"'

    def __str__(self):
        return self.title or str(self.posts_id)
