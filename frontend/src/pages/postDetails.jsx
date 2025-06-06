import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

const PostDetails = () => {
  const [searchParams] = useSearchParams();
  const postId = searchParams.get("postId");

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      try {
        const res = await axios.get(`/api/posts/${postId}`);
        if (res.data.success) {
          setPost(res.data.data);
        } else {
          setError("게시글을 불러올 수 없습니다.");
        }
      } catch (err) {
        setError("에러 발생: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div>{error}</div>;
  if (!post) return <div>게시글이 존재하지 않습니다.</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{post.title}</h1>
      <p className="text-gray-600 mt-2">{post.content}</p>
    </div>
  );
};

export default PostDetails;
