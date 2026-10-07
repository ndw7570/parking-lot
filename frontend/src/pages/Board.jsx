import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, AppBar, Loading, Empty, Badge, AccountButton } from "../components/ui";
import { Segment } from "../components/form";
import { IconBoard, IconPlus, IconChevron } from "../components/Icons";
import { postApi } from "../api/resources";
import { formatDate } from "../lib/domain";

// posts_type from the matrix (Image 2)
const TYPES = [
  { value: "all", label: "전체" },
  { value: "NOTICE", label: "공지" },
  { value: "FREE", label: "자유" },
  { value: "QNA", label: "문의" },
];
const TYPE_LABEL = { NOTICE: "공지", FREE: "자유", QNA: "문의" };

export default function Board() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [type, setType] = useState("all");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await postApi.list();
        if (alive) setPosts(list);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => {
    const filtered =
      type === "all" ? posts : posts.filter((p) => p.posts_type === type);
    // pinned first, then newest
    return [...filtered].sort((a, b) => {
      if (Boolean(b.is_pinned) !== Boolean(a.is_pinned))
        return b.is_pinned ? 1 : -1;
      return (b.posts_id || 0) - (a.posts_id || 0);
    });
  }, [posts, type]);

  return (
    <Shell bar={<AppBar sub="Board" title="게시판" right={<AccountButton />} />}>
      <Segment options={TYPES} value={type} onChange={setType} />

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty icon={<IconBoard width={26} height={26} />} title="게시글이 없습니다" />
      ) : (
        <div className="card" style={{ padding: "4px 16px" }}>
          {rows.map((p) => (
            <button
              key={p.posts_id}
              className="list-row"
              onClick={() => nav(`/board/${p.posts_id}`)}
              style={{
                width: "100%",
                background: "none",
                border: 0,
                textAlign: "left",
              }}
            >
              <span className="grow">
                <span className="row" style={{ gap: 6 }}>
                  {p.is_pinned ? (
                    <Badge tone="danger">고정</Badge>
                  ) : (
                    <Badge tone="neutral">
                      {TYPE_LABEL[p.posts_type] || "글"}
                    </Badge>
                  )}
                  <span className="title" style={{ flex: 1 }}>
                    {p.title || "(제목 없음)"}
                  </span>
                </span>
                <span className="meta">
                  {formatDate(p.created_at)} · 댓글 {p.comment_count || 0} · 좋아요{" "}
                  {p.like_count || 0}
                </span>
              </span>
              <IconChevron width={18} height={18} color="var(--text-faint)" />
            </button>
          ))}
        </div>
      )}

      <button
        className="fab"
        onClick={() => nav("/board/new")}
        aria-label="글쓰기"
      >
        <IconPlus width={24} height={24} />
      </button>
    </Shell>
  );
}
