import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import PostCard from "../components/PostCard";
import { auth } from "../api/firebase";

const PostDetails = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const postId = searchParams.get("postId");

  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);

  const user = auth.currentUser;

  useEffect(() => {

    const fetchPost = async () => {
      try {
        const res = await axios.get(`/api/posts/${postId}`);

        if (res.data.success) {
        const postData = res.data.data;

        // 🔹 user 데이터가 없으면 기본값 채우기
        if (!postData.user) {
          postData.user = {
            name: "User",
            image: "/defaultUser.png",
          };
        }
        setPost(postData);
        } else {
          setError(res.data.message || "게시글을 불러올 수 없습니다.");
          navigate("/home"); 
        }
      } catch (err) {
        if (err.response?.status === 404) {
        setError("삭제되었거나 존재하지 않는 게시글입니다.");
      } else {
        setError("에러 발생: " + err.message);
      }
      navigate("/home");
    } 
    };

    fetchPost();
  }, [postId, navigate]);

  if (error) return <div>로딩 중...</div>;
  if (!post) return <div>{error}</div>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <PostCard item={post} currentUser={user} />
    </div>
  );
};

export default PostDetails;
