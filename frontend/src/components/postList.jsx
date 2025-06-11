import React, { useEffect, useRef } from "react";
import PostCard from "./PostCard";
import Loading from "./loading"; // 로딩 컴포넌트
import { useNavigate } from "react-router-dom";

const PostList = ({
  posts,
  currentUser,

  isLoading,
  loadMore,
  hasMore,
}) => {
  const bottomRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          console.log("got to the end");
          loadMore();
        }
      },
      { threshold: 0 }
    );

    if (bottomRef.current) observer.observe(bottomRef.current);

    return () => {
      if (bottomRef.current) observer.unobserve(bottomRef.current);
    };
  }, [bottomRef, hasMore]);

  return (
    <div className="flex flex-col gap-6">
      {posts.map((item) => (
        <PostCard
          key={item._id || item.id}
          item={item}
          currentUser={currentUser}
          navigate={navigate}
        />
      ))}

      {/* Footer 상태 렌더링 */}
      <div
        ref={bottomRef}
        style={{
          margin: posts.length === 0 ? "200px 0" : "30px 0",
          textAlign: "center",
        }}
      >
        {hasMore ? (
          isLoading && <Loading />
        ) : (
          <p style={{ color: "#888", fontSize: "16px" }}>No more posts</p>
        )}
      </div>
    </div>
  );
};

export default PostList;
