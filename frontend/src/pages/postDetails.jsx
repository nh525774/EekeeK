import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import PostCard from "../components/PostCard";
import { auth } from "../api/firebase";
import CommentItem from "../components/CommentItem";
import { createComment, removeComment } from "../services/postService";

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

    (async () => {
      try {
        if (!auth.currentUser) return;
         const token = await auth.currentUser.getIdToken();
       const { data } = await axios.get("/api/users/me", {
         headers: { Authorization: `Bearer ${token}` },
       });
       setMeId(data?._id || null);
     } catch (e) {
       setMeId(null);
     }
   })();

    const fetchPost = async () => {
      try {
        const res = await axios.get(`/api/posts/${postId}`);
        if (res.data.success) {

          const postData = res.data.data;

        // 🔹 user 기본값 채우기
        if (!postData.user) {
          postData.user = {
            name: "User",
            image: "/defaultUser.png",
          };
        }

        // 🔹 comments 기본값도 방어
        if (!postData.comments) {
          postData.comments = [];
        }

          setPost(res.data.data);
        } else {
          setError("게시글을 불러올 수 없습니다.");
          navigate("/home"); 
        }
      } catch (err) {
        setError("삭제되었거나 존재하지 않는 게시글입니다.", err.message);
        navigate("/home");
    } 
    };
    fetchPost();
  }, [postId, navigate]);

  const handleAddComment = async () => {
    if(!commentText.trim()) return;
    const res = await createComment(postId, commentText)
    if (res.success) {
      setPost(prev => ({
        ...prev,
        comments: [...prev.comments, res.data]
      }));
      setCommentText("");

      if (post?.userId) {
       const token = await auth.currentUser.getIdToken();
      await axios.post(
      "/api/notifications",
      {
        receiverId: post.userId, 
        message: "회원님 게시물에 댓글을 남겼습니다.",
        type: "post_comment",
        data: { postId }
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
      setPost(prev => ({
        ...prev,
        comments: prev.comments.filter(c => c._id !== comment._id)
      }));
    } else {
      alert(res.msg);
    }
  };

  if (!post) return <div>{error || "로딩 중..."}</div>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <PostCard item={post} currentUser={user} showMoreIcon={false} navigate={navigate} />
    {/* 댓글 입력 */}
    <div style={{ marginTop: 20, display: "flex", gap: "10px" }}>
      <input
      type="text"
      value={commentText}
      onChange={(e) => setCommentText(e.target.value)}
      placeholder="Type comment..."
      style={{ flex: 1, padding: 10, borderRadius: 8 }}
      />
      <button onClick={handleAddComment}>등록</button>
    </div>

    { /*Comment list */ }
    <div style ={{marginTop: 15 }}>
      {
        post?.comments?.length > 0 ? (
          post.comments.map((comment, idx) => (
            <CommentItem
              key={comment?._id ?? `${comment.userId}-${comment.createdAt ?? ''}-${idx}`}
              item={comment}
              canDelete={
                // 댓글 작성자(Firebase UID) 또는 게시글 작성자(ObjectId)
                (user?.uid && comment.userId === user.uid) ||
                (meId && String(post.userId) === String(meId))
              }
              onDelete = {handleDeleteComment}
         />
          ))
        ) : (
          <p>첫 댓글을 남겨 보세요!</p>
      )}
      </div>
    </div>
  );
};

export default PostDetails;
