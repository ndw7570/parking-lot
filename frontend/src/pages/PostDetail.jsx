import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Shell, AppBar, Loading, Empty, Badge, useToast } from "../components/ui";
import { Field, TextInput, TextArea, ChipPicker } from "../components/form";
import { IconBoard } from "../components/Icons";
import { postApi, commentApi } from "../api/resources";
import { formatDate } from "../lib/domain";

const TYPE_LABEL = { NOTICE: "공지", FREE: "자유", QNA: "문의" };
const TYPE_OPTS = [
  { value: "NOTICE", label: "공지사항" },
  { value: "FREE", label: "자유게시판" },
  { value: "QNA", label: "문의게시판" },
];

export default function PostDetail() {
  const { id } = useParams();
  const isNew = id === "new";
  return isNew ? <NewPost /> : <ViewPost id={id} />;
}

function NewPost() {
  const nav = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    posts_type: "FREE",
    title: "",
    content: "",
  });
  const onInput = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast("제목을 입력해 주세요.", "err");
      return;
    }
    setBusy(true);
    try {
      const post = await postApi.create({
        posts_type: form.posts_type,
        title: form.title.trim(),
        content: form.content || null,
        is_pinned: form.posts_type === "NOTICE",
        view_count: 0,
        comment_count: 0,
        like_count: 0,
        is_deleted: false,
      });
      toast("게시글이 등록되었습니다.");
      nav(`/board/${post.posts_id}`, { replace: true });
    } catch {
      toast("등록에 실패했습니다.", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell bar={<AppBar title="글쓰기" sub="New Post" back />} hideTabs>
      <form onSubmit={submit}>
        <Field label="게시판">
          <ChipPicker
            options={TYPE_OPTS}
            value={form.posts_type}
            onChange={(v) => setForm((f) => ({ ...f, posts_type: v }))}
          />
        </Field>
        <Field label="제목">
          <TextInput
            placeholder="제목"
            value={form.title}
            onChange={onInput("title")}
            autoFocus
          />
        </Field>
        <Field label="내용">
          <TextArea
            placeholder="내용을 입력하세요"
            value={form.content}
            onChange={onInput("content")}
            style={{ minHeight: 160 }}
          />
        </Field>
        <button className="btn primary" disabled={busy}>
          {busy ? "등록 중…" : "등록"}
        </button>
      </form>
    </Shell>
  );
}

function ViewPost({ id }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [p, allComments] = await Promise.all([
        postApi.get(id),
        commentApi.list().catch(() => []),
      ]);
      setPost(p);
      setComments(
        allComments.filter((c) => String(c.post) === String(id))
      );
    } catch {
      setPost(false);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [id]);

  async function addComment(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await commentApi.create({
        post: Number(id),
        content: reply.trim(),
        depth: 0,
        reply_count: 0,
        like_count: 0,
        is_deleted: false,
      });
      setReply("");
      toast("댓글이 등록되었습니다.");
      load();
    } catch {
      toast("댓글 등록에 실패했습니다.", "err");
    } finally {
      setSending(false);
    }
  }

  if (loading)
    return (
      <Shell bar={<AppBar title="게시글" sub="Post" back />} hideTabs>
        <Loading />
      </Shell>
    );
  if (!post)
    return (
      <Shell bar={<AppBar title="게시글" sub="Post" back />} hideTabs>
        <Empty icon={<IconBoard width={26} height={26} />} title="게시글을 찾을 수 없습니다" />
      </Shell>
    );

  return (
    <Shell bar={<AppBar title="게시글" sub="Post" back />} hideTabs>
      <div className="card">
        <div className="row" style={{ gap: 6, marginBottom: 8 }}>
          {post.is_pinned ? (
            <Badge tone="danger">고정</Badge>
          ) : (
            <Badge tone="neutral">{TYPE_LABEL[post.posts_type] || "글"}</Badge>
          )}
          <span className="muted" style={{ fontSize: 12 }}>
            {formatDate(post.created_at)}
          </span>
        </div>
        <h2 style={{ margin: "0 0 10px", fontSize: 19, letterSpacing: "-0.01em" }}>
          {post.title}
        </h2>
        <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
          {post.content || ""}
        </p>
        <div
          className="row"
          style={{ gap: 14, marginTop: 14, color: "var(--text-faint)", fontSize: 12.5 }}
        >
          <span>조회 {post.view_count || 0}</span>
          <span>댓글 {comments.length}</span>
          <span>좋아요 {post.like_count || 0}</span>
        </div>
      </div>

      <div className="section-title">댓글 {comments.length}</div>
      {comments.length === 0 ? (
        <div className="card muted" style={{ textAlign: "center", fontSize: 13 }}>
          첫 댓글을 남겨보세요.
        </div>
      ) : (
        <div className="card" style={{ padding: "4px 16px" }}>
          {comments.map((c) => (
            <div
              className="list-row"
              key={c.comments_id}
              style={{
                paddingLeft: c.depth ? 20 : 4,
                borderLeft: c.depth ? "2px solid var(--line)" : "none",
              }}
            >
              <span className="grow">
                <span style={{ fontSize: 14 }}>{c.content}</span>
                <span className="meta">{formatDate(c.created_at)}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addComment} style={{ marginTop: 14 }}>
        <div className="row" style={{ gap: 8 }}>
          <input
            className="input"
            placeholder="댓글 입력"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <button
            className="btn signal"
            style={{ width: "auto", padding: "13px 18px" }}
            disabled={sending || !reply.trim()}
          >
            등록
          </button>
        </div>
      </form>
    </Shell>
  );
}
