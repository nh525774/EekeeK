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
      { threshold: 0 } // 기능 그대로
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
        // 빈 상태도 '요즘 감성'으로 살짝 스타일만
        <div className="card-glass shadow-soft rounded-2xl p-6 text-center text-muted-foreground">
          No posts available.
        </div>
      ) : (
        posts.map((item, index) => {
          // 안정적인 key와 안전한 user 기본값 유지
          const safeItem = {
            ...item,
            _id:
              item._id ||
              item.id ||
              `temp-${index}-${Date.now()}-${Math.random()}`,
            user:
              item.user && typeof item.user === "object"
                ? item.user
                : { name: "User", image: "/defaultUser.png" },
          };

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

      {/* Footer / sentinel */}
      <div
        ref={bottomRef}
        style={{
          margin: posts.length === 0 ? "200px 0" : "30px 0",
          textAlign: "center",
        }}
        className="text-muted-foreground"
        aria-label="infinite-scroll-sentinel"
      >
        {hasMore ? (
          isLoading && (
            <div className="inline-block card-glass shadow-soft rounded-xl px-4 py-2">
              <Loading />
            </div>
          )
        ) : (
          <p className="text-sm">No more posts</p>
        )}
      </div>
    </div>
  );
};

export default PostList;
