"""웹 점검(2026-11-21)에서 찾은 서버 쪽 결함 회귀 테스트.

- 게시글·댓글이 작성자·날짜 없이 저장돼 목록에 "-" 로 나오고, 작성자도 자기 글을 못 고쳤다.
- 댓글을 달아도 목록의 댓글 수가 0 으로 남았다.
- 한 거주민이 두 세대에 동시에 연결됐다(FR-5.5).
"""
from django.test import TestCase

from parking_management.models.parking.dong_ho import DongHo
from parking_management.models.posts.post import Post
from parking_management.tests.factories import auth_client, make_profile

POST_URL = "/api/parking/post/"
COMMENT_URL = "/api/parking/comment/"
DONG_HO_URL = "/api/parking/dong-ho/"


def make_home(name, user=None):
    return DongHo.objects.create(dong_ho_name=name, user=user, is_deleted=False)


class BoardAuthorTests(TestCase):
    def setUp(self):
        make_profile("resident1")
        self.client = auth_client("resident1")

    def _post(self):
        res = self.client.post(
            POST_URL,
            {"posts_type": "FREE", "title": "제목", "is_pinned": False, "comment_count": 0},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        return Post.objects.get(title="제목")

    def test_post_gets_author_and_date(self):
        post = self._post()
        self.assertEqual(post.user_id, "resident1")
        self.assertIsNotNone(post.created_at)

    def test_author_can_edit_own_post(self):
        post = self._post()
        res = self.client.patch(f"{POST_URL}{post.pk}/", {"title": "고친 제목"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)

    def test_admin_without_profile_still_posts(self):
        admin = auth_client("admin", is_staff=True)
        res = admin.post(POST_URL, {"title": "공지", "is_pinned": True}, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertIsNone(Post.objects.get(title="공지").user_id)

    def test_comment_count_follows_comments(self):
        post = self._post()
        res = self.client.post(COMMENT_URL, {"post": post.pk, "content": "확인", "depth": 0}, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        post.refresh_from_db()
        self.assertEqual(post.comment_count, 1)

        comment_id = post.comments.first().pk if hasattr(post, "comments") else None
        if comment_id is None:
            from parking_management.models.posts.comment import Comment
            comment_id = Comment.objects.get(post=post).pk
        res = self.client.delete(f"{COMMENT_URL}{comment_id}/")
        self.assertEqual(res.status_code, 200, res.content)
        post.refresh_from_db()
        self.assertEqual(post.comment_count, 0)


class SingleHomeTests(TestCase):
    def setUp(self):
        self.resident = make_profile("resident1")
        self.home = make_home("101호", self.resident)
        self.empty = make_home("103호")

    def test_resident_cannot_take_second_home(self):
        client = auth_client("resident1")
        res = client.patch(f"{DONG_HO_URL}{self.empty.pk}/", {"user": "resident1"}, format="json")
        self.assertEqual(res.status_code, 400, res.content)
        self.empty.refresh_from_db()
        self.assertIsNone(self.empty.user_id)

    def test_admin_cannot_link_same_person_twice(self):
        admin = auth_client("admin", is_staff=True)
        res = admin.post(DONG_HO_URL, {"dong_ho_name": "201호", "user": "resident1"}, format="json")
        self.assertEqual(res.status_code, 400, res.content)

    def test_editing_own_home_still_works(self):
        client = auth_client("resident1")
        res = client.patch(f"{DONG_HO_URL}{self.home.pk}/", {"user": "resident1", "remarks": "메모"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)

    def test_move_after_leaving_old_home(self):
        admin = auth_client("admin", is_staff=True)
        self.assertEqual(admin.patch(f"{DONG_HO_URL}{self.home.pk}/", {"user": None}, format="json").status_code, 200)
        res = admin.patch(f"{DONG_HO_URL}{self.empty.pk}/", {"user": "resident1"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
