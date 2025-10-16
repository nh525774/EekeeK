// src/pages/PostDetails.jsx
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
          if (!postData.user) postData.user = { name: "User", image: "/defaultUser.png" };
          if (!Array.isArray(postData.comments)) postData.comments = [];
          if (!cancelled) { setPost(postData); setStatus("ok"); }
        } else {
          if (!cancelled) { setError("게시글을 불러올 수 없습니다."); setStatus("error"); }
          navigate("/home", { replace: true });
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          if (!cancelled) { setError("이 게시글은 삭제되었어요."); setStatus("gone"); }
          navigate("/home", { replace: true });
          return;
        }
        // 그 외 에러
        if (!cancelled) { setError("게시글을 불러오지 못했습니다."); setStatus("error"); }
        navigate("/home", { replace: true });
      }
    };

    fetchPost();
    return () => { cancelled = true; };
  }, [postId, navigate]);

  // ⬇️ 자동 백그라운드 PII 스캔 (동시 2개)
  const comments = useMemo(() => post?.comments ?? [], [post]);

  // 댓글 작성
  const handleAddComment = async () => {
    if (!commentText.trim()) return;
  const res = await createComment(postId, commentText);
    if (!res?._error && res?._id) {
   // 성공: res는 "댓글 객체" (contentForViewer 포함)
   setPost(prev => prev
     ? { ...prev, comments: [...(prev.comments || []), res] }
     : prev
   );
   setCommentText("");


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
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <Header title="게시물" showBack />
      <div style={{ padding: 20 }}>
        {status !== "ok" ? (
          <div>{status === "loading" ? "로딩 중..." : (error || "문제가 발생했습니다.")}</div>
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
                comments.map((comment, idx) => (
                    <CommentItem
                      key={comment?._id ?? `${comment.userId}-${comment.createdAt ?? ""}-${idx}`}
                      item={comment}
                      displayText={comment.contentForViewer ?? comment.text ?? ""}          // ⬅️ 상태표시용(선택)
                      canDelete={
                        (user?.uid && comment.userId === user.uid) ||
                        (meId && String(post.userId) === String(meId))
                      }
                      onDelete={handleDeleteComment}
                    />
             )) 
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
