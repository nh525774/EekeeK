import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import PostCard from "../components/PostCard";
import { auth } from "../api/firebase";

const PostDetails = () => {
  const [searchParams] = useSearchParams();
  const postId = searchParams.get("postId");

  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);

  const user = auth.currentUser;

  useEffect(() => {

    const fetchPost = async () => {
      try {
        const res = await axios.get(`/api/posts/${postId}`);
        if (res.data.success) {
          const data = res.data.data;

          if (!data.user) {
            data.user = {
              name: "User",
              image: "/defaultUser.png",
            };
          }
          setPost(data);
        } else {
          setError("게시글을 불러올 수 없습니다.");
        }
      } catch (err) {
        setError("에러 발생: " + err.message);
      }
    };

    if (postId) fetchPost();
  }, [postId]);

  if (error) return <div>로딩 중...</div>;
  if (!post) return <div>{error}</div>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <PostCard item={post} currentUser={user} />
    </div>
  );
};

export default PostDetails;
