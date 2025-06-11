import React, { useEffect, useRef } from "react";
import PostCard from "../components/PostCard";
import Loading from "../components/Loading";

const PostList = ({ posts, currentUser, router, isLoading, loadMore }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          console.log("got to the end"); // ✅ onEndReached
          loadMore(); // ✅ getPosts() 호출
        }
      },
      { threshold: 0 } // ✅ onEndReachedThreshold={0}
    );

    if (bottomRef.current) {
      observer.observe(bottomRef.current);
    }

    return () => {
      if (bottomRef.current) observer.unobserve(bottomRef.current);
    };
  }, [bottomRef]);

  return (
    <div className="flex flex-col gap-6">
      {/* 게시물 카드 목록 */}
      {posts.map((item) => (
        <PostCard
          key={item._id || item.id}
          item={item}
          currentUser={currentUser}
          router={router}
        />
      ))}

      {/* Footer → 화면 끝 감지용 */}
      <div
        ref={bottomRef}
        style={{
          margin: posts.length === 0 ? "200px 0" : "30px 0",
          height: 40,
        }}
      >
        {isLoading && <Loading />}
      </div>
    </div>
  );
};

export default PostList;
