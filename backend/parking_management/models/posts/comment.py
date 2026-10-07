from django.db import models
from .post import Post
from parking_management.models.parking.user_profile import UserProfile
from core.models.common import SoftDeleteModel


class Comment(SoftDeleteModel):
    """댓글/대댓글"""
    comments_id = models.AutoField(primary_key=True, db_comment="댓글ID")
    post = models.ForeignKey(
        Post,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="posts_id",
        related_name="comments",
        db_comment="게시글ID",
    )
    reply_count = models.IntegerField(null=True, blank=True, db_comment="대댓글수")
    depth = models.IntegerField(null=True, blank=True, db_comment="수준")
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="user_id",
        related_name="comments",
        db_comment="유저ID",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="parent_id",
        related_name="replies",
        db_comment="부모ID",
    )
    content = models.TextField(null=True, blank=True, db_comment="댓글내용")
    like_count = models.IntegerField(null=True, blank=True, db_comment="댓글좋아요수")
    created_at = models.DateField(null=True, blank=True, db_comment="생성일")
    updated_at = models.DateField(null=True, blank=True, db_comment="수정일")
    deleted_at = models.DateField(null=True, blank=True, db_comment="삭제일")
    remarks = models.TextField(null=True, blank=True, db_comment="비고")
    is_deleted = models.BooleanField(null=False, blank=True, db_comment="삭제여부")

    class Meta:
        db_table = '"parking_lot"."comments"'

    def __str__(self):
        return self.content[:30] if self.content else str(self.comments_id)
