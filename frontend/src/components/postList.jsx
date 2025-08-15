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
   meId,
}) => {
  const bottomRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {}, [posts, hasMore]);

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

    const currentBottomRef = bottomRef.current;
    if (currentBottomRef) observer.observe(currentBottomRef);

    return () => {
      if (currentBottomRef) observer.unobserve(currentBottomRef);
    };
  }, [bottomRef, hasMore, loadMore]);

  return (
    <div className="flex flex-col gap-6">
      {posts.length === 0 ? (
        <p>No posts available.</p> // 데이터가 없으면 메시지 표시
      ) : (
        posts.map((item, index) => {
          //console.log("item._id:", item._id);
          //console.log("item.id:", item.id); 

        const safeItem = {
          ...item,
          _id: item._id || item.id || `temp-${index}-${Date.now()}-${Math.random()}`, // 🔹 key 보장
          user: item.user && typeof item.user === "object"
            ? item.user
            : { name: "User", image: "/defaultUser.png" }, // 🔹 user null 방지
        };


  //console.log("Generated key for post:", safeItem._id);

  return (
    <PostCard
      key={`${safeItem._id}-${index}`}
      item={safeItem}
      currentUser={currentUser}
      navigate={navigate}
      meId={meId}
    />
  );
})
)}

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
