import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import PostCard from "../components/PostCard";
import { auth } from "../api/firebase";
import CommentItem from "../components/CommentItem";
import { createComment, removeComment } from "../services/postService";
import Header from "../components/Header";

const PostDetails = () => {
  const { id: pathId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const postId = pathId || searchParams.get("postId");

  const [post, setPost] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("loading");

  const user = auth.currentUser;
  const [meId, setMeId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!auth.currentUser) return;
        const token = await auth.currentUser.getIdToken();
        const { data } = await axios.get("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setMeId(data?._id ?? null);
      } catch {
        if (!cancelled) setMeId(null);
      }
    })();

    const fetchPost = async () => {
      try {
        const res = await axios.get(`/api/posts/${postId}`);
        if (res.data.success) {
          const postData = res.data.data ?? {};
          if (!postData.user)
            postData.user = { name: "User", image: "/defaultUser.png" };
          if (!Array.isArray(postData.comments)) postData.comments = [];
          if (!cancelled) {
            setPost(postData);
            setStatus("ok");
          }
        } else {
          if (!cancelled) {
            setError("게시글을 불러올 수 없습니다.");
            setStatus("error");
          }
          navigate("/home", { replace: true });
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          if (!cancelled) {
            setError("이 게시글은 삭제되었어요.");
            setStatus("gone");
          }
          navigate("/home", { replace: true });
          return;
        }
        // 그 외 에러
        if (!cancelled) {
          setError("게시글을 불러오지 못했습니다.");
          setStatus("error");
        }
        navigate("/home", { replace: true });
      }
    };

    fetchPost();
    return () => {
      cancelled = true;
    };
  }, [postId, navigate]);

  // ⬇️ 자동 백그라운드 PII 스캔 (동시 2개)
  const comments = useMemo(() => post?.comments ?? [], [post]);

  // 댓글 작성
  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    const res = await createComment(postId, commentText);
    if (!res?._error && res?._id) {
      setPost((prev) =>
        prev ? { ...prev, comments: [...(prev.comments || []), res] } : prev
      );
      setCommentText("");

      if (post?.userId) {
        const token = await auth.currentUser.getIdToken();
        await axios.post(
          "/api/notifications",
          {
            receiverId: post.userId,
            message: "회원님 게시물에 댓글을 남겼습니다.",
            type: "post_comment",
            data: { postId },
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } else {
      alert(res?.msg || "댓글 등록 실패");
    }
  };

  const handleDeleteComment = async (comment) => {
    const res = await removeComment(postId, comment._id);
    if (res.success) {
      setPost((prev) => ({
        ...prev,
        comments: prev.comments.filter((c) => c._id !== comment._id),
      }));
    } else {
      alert(res.msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background text-foreground">
      <Header title="게시물" showBack />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {status !== "ok" ? (
          <div className="card-glass shadow-soft rounded-2xl p-6 text-center">
            {status === "loading"
              ? "로딩 중..."
              : error || "문제가 발생했습니다."}
          </div>
        ) : (
          <>
            {/* 본문 카드 */}
            <PostCard
              item={post}
              currentUser={user}
              showMoreIcon={false}
              navigate={navigate}
            />

            {/* 댓글 입력 */}
            <div className="card-glass shadow-soft rounded-2xl p-4 sm:p-5 mt-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Type comment..."
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid hsl(var(--border))",
                    outline: "none",
                    background: "transparent",
                    color: "hsl(var(--foreground))",
                  }}
                  className="focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={handleAddComment}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid hsl(var(--border))",
                    cursor: "pointer",
                    fontWeight: 600,
                    background: "transparent",
                  }}
                  className="btn-ghost"
                >
                  등록
                </button>
              </div>
            </div>

            {/* 댓글 리스트 */}
            <div className="mt-4 space-y-2">
              {comments.length > 0 ? (
                comments.map((comment, idx) => (
                  <CommentItem
                    key={
                      comment?._id ??
                      `${comment.userId}-${comment.createdAt ?? ""}-${idx}`
                    }
                    item={comment}
                    displayText={comment.contentForViewer ?? comment.text ?? ""}
                    canDelete={
                      (user?.uid && comment.userId === user.uid) ||
                      (meId && String(post.userId) === String(meId))
                    }
                    onDelete={handleDeleteComment}
                  />
                ))
              ) : (
                <p className="text-muted-foreground">첫 댓글을 남겨 보세요!</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PostDetails;
