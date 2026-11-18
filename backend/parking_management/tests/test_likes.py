"""P005-009: 좋아요를 취소(소프트 삭제)한 뒤 다시 누를 수 있어야 한다 (B-07)."""
from django.test import TestCase

from parking_management.models.posts.comment import Comment
from parking_management.models.posts.post import Post
from parking_management.tests.factories import auth_client, make_profile

URL = "/api/parking/post-like/"
COMMENT_URL = "/api/parking/comment-like/"


class PostLikeTests(TestCase):
    def setUp(self):
        self.client = auth_client()
        self.user = make_profile()
        self.post = Post.objects.create(title="공지", is_pinned=False, is_deleted=False)

    def _like(self):
        payload = {"post": self.post.pk, "user": self.user.pk}
        return self.client.post(URL, payload, format="json")

    def test_like_again_after_unlike(self):
        first = self._like()
        self.assertEqual(first.status_code, 201, first.content)
        like_id = first.json()["posts_like_id"]
        self.assertEqual(self.client.delete(f"{URL}{like_id}/").status_code, 200)

        again = self._like()

        self.assertEqual(again.status_code, 201, again.content)

    def test_rejects_duplicate_active_like(self):
        self.assertEqual(self._like().status_code, 201)

        dup = self._like()

        self.assertEqual(dup.status_code, 400, dup.content)


class CommentLikeTests(TestCase):
    def setUp(self):
        self.client = auth_client()
        self.user = make_profile()
        post = Post.objects.create(title="글", is_pinned=False, is_deleted=False)
        self.comment = Comment.objects.create(post=post, content="댓글", is_deleted=False)

    def _like(self):
        payload = {"comment": self.comment.pk, "user": self.user.pk}
        return self.client.post(COMMENT_URL, payload, format="json")

    def test_like_again_after_unlike(self):
        first = self._like()
        self.assertEqual(first.status_code, 201, first.content)
        like_id = first.json()["comments_like_id"]
        self.assertEqual(self.client.delete(f"{COMMENT_URL}{like_id}/").status_code, 200)

        again = self._like()

        self.assertEqual(again.status_code, 201, again.content)


class RestoreConflictTests(TestCase):
    """복구하려는 행과 같은 값의 살아 있는 행이 있으면 500 이 아니라 400 이어야 한다."""

    def setUp(self):
        self.client = auth_client()
        self.user = make_profile()
        self.post = Post.objects.create(title="공지", is_pinned=False, is_deleted=False)

    def test_restore_conflicting_like_returns_400(self):
        payload = {"post": self.post.pk, "user": self.user.pk}
        old_id = self.client.post(URL, payload, format="json").json()["posts_like_id"]
        self.client.delete(f"{URL}{old_id}/")
        self.assertEqual(self.client.post(URL, payload, format="json").status_code, 201)

        # 복구는 관리자 기능이다(일반 사용자 좋아요 복구 흐름은 화면에 없다).
        admin = auth_client("boss", is_staff=True)

        res = admin.patch(f"{URL}{old_id}/restore/")

        self.assertEqual(res.status_code, 400, res.content)
