from django.db import models
from .comment import Comment
from parking_management.models.parking.user_profile import UserProfile
from core.models.common import SoftDeleteModel


class CommentLike(SoftDeleteModel):
    """댓글좋아요"""
    comments_like_id = models.AutoField(primary_key=True, db_comment="댓글좋아요ID")
    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        db_column="comments_id",
        related_name="comment_likes",
        db_comment="댓글ID",
    )
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="user_id",
        related_name="comment_likes",
        db_comment="유저ID",
    )
    remarks = models.TextField(null=True, blank=True, db_comment="비고")
    is_deleted = models.BooleanField(null=False, blank=True, db_comment="삭제여부")

    class Meta:
        db_table = '"parking_lot"."comments_like"'
        constraints = [
            models.UniqueConstraint(fields=["comment", "user"], name="uq_comments_like_comment_user"),
        ]

    def __str__(self):
        return str(self.comments_like_id)
