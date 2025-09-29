// src/pages/PostDetails.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import PostCard from "../components/PostCard";
import { auth } from "../api/firebase";
import CommentItem from "../components/CommentItem";
import { createComment, removeComment } from "../services/postService";
import Header from "../components/Header";
import usePiiScanQueue from "../hooks/usePiiScanQueue"; // ⬅️ 추가

const PostDetails = () => {
  const { id: pathId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const postId = pathId || searchParams.get("postId");

  const [post, setPost] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState(null);

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
          if (!postData.user) postData.user = { name: "User", image: "/defaultUser.png" };
          if (!Array.isArray(postData.comments)) postData.comments = [];
          if (!cancelled) setPost(postData);
        } else {
          if (!cancelled) setError("게시글을 불러올 수 없습니다.");
          navigate("/home");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("삭제되었거나 존재하지 않는 게시글입니다.");
        navigate("/home");
      }
    };

    fetchPost();
    return () => { cancelled = true; };
  }, [postId, navigate]);

  // ⬇️ 자동 백그라운드 PII 스캔 (동시 2개)
  const comments = useMemo(() => post?.comments ?? [], [post]);
  const { getResultFor } = usePiiScanQueue(comments, { concurrency: 2 });

  // 댓글 작성
  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    const res = await createComment(postId, commentText);
    if (res.success) {
      setCommentText("");
      // 새 댓글을 로컬에 붙여주면 훅이 자동으로 스캔함
      setPost(prev =>
        prev ? { ...prev, comments: [...(prev.comments || []), res.data] } : prev
      );

      // 알림 유지 로직
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
      alert(res.msg);
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
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <Header title="게시물" showBack />
      <div style={{ padding: 20 }}>
        {!post ? (
          <div>{error || "로딩 중..."}</div>
        ) : (
          <>
            <PostCard
              item={post}
              currentUser={user}
              showMoreIcon={false}
              navigate={navigate}
            />

            {/* 댓글 입력 */}
            <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Type comment..."
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  outline: "none",
                }}
              />
              <button
                onClick={handleAddComment}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  cursor: "pointer",
                  fontWeight: 600,
                  background: "#fff",
                }}
              >
                등록
              </button>
            </div>

            {/* 댓글 리스트 */}
            <div style={{ marginTop: 15 }}>
              {comments.length > 0 ? (
                comments.map((comment, idx) => {
                  const r = getResultFor(comment);
                  const scanning = !r;
                  const displayText = r?.maskedText ?? comment.text ?? "";

                  return (
                    <CommentItem
                      key={comment?._id ?? `${comment.userId}-${comment.createdAt ?? ""}-${idx}`}
                      item={comment}
                      displayText={displayText}     // ⬅️ 추가 전달
                      scanning={scanning}           // ⬅️ 상태표시용(선택)
                      canDelete={
                        (user?.uid && comment.userId === user.uid) ||
                        (meId && String(post.userId) === String(meId))
                      }
                      onDelete={handleDeleteComment}
                    />
                  );
                })
              ) : (
                <p>첫 댓글을 남겨 보세요!</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PostDetails;
