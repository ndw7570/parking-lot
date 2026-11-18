from django.db import models
from .post import Post
from parking_management.models.parking.user_profile import UserProfile
from core.models.common import SoftDeleteModel


class PostLike(SoftDeleteModel):
    """게시글좋아요"""
    posts_like_id = models.AutoField(primary_key=True, db_comment="게시글좋아요ID")
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        db_column="posts_id",
        related_name="post_likes",
        db_comment="게시글ID",
    )
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="user_id",
        related_name="post_likes",
        db_comment="유저ID",
    )
    remarks = models.TextField(null=True, blank=True, db_comment="비고")
    is_deleted = models.BooleanField(null=False, blank=True, db_comment="삭제여부")

    class Meta:
        db_table = '"parking_lot"."posts_like"'
        constraints = [
            # 취소(소프트 삭제)한 좋아요가 남아 있어도 다시 누를 수 있도록 살아 있는 행끼리만 유일하게 한다.
            models.UniqueConstraint(
                fields=["post", "user"],
                condition=models.Q(is_deleted=False),
                name="uq_posts_like_post_user",
            ),
        ]

    def __str__(self):
        return str(self.posts_like_id)
