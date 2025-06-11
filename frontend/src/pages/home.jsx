import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import Button from "../components/Button";
import ScreenWrapper from "../components/ScreenWrapper";
import { theme } from "../constants/theme";
import { hp, wp } from "../helpers/common";
import Icon from "../assets/icons";
import { useNavigate } from "react-router-dom";
import Avatar from "../components/Avatar";
import { useAuth } from "../contexts/authContext";
import PostCard from "../components/PostCard";
import { getUserById } from "../services/userService";
import { fetchPosts } from "../services/postService";
import PostList from "../components/postList";

var limit = 0;

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const handlePostEvent = async (payload) => {
    if (payload.eventType === "INSERT" && payload?.new?.id) {
      let newPost = { ...payload.new };

      try {
        const res = await getUserById(newPost.userId); // Firebase UID로 유저 정보 가져오기
        newPost.user = res.success
          ? res.user
          : {
              name: "탈퇴한 사용자",
              profileImage: "/default-profile.png",
            };

        setPosts((prevPosts) => [newPost, ...prevPosts]); // 최신 게시물을 앞에 추가
      } catch (err) {
        console.error("유저 정보 조회 실패:", err);
      }
    }
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await axios.get("/api/posts");
        if (res.data.success) {
          setPosts(res.data.data);
        }
      } catch (err) {
        console.error("게시글 로드 실패:", err);
      }
    };
    fetchPosts();
  }, []);

  const getPosts = async () => {
    if (!hasMore) return;
    setLoading(true);

    limit += 5;
    try {
      const token = localStorage.getItem("firebaseToken");
      const res = await fetchPosts(limit, token);
      if (res.success) {
        if (posts.length === res.data.length) setHasMore(false);
        setPosts(res.data);
      }
    } catch (err) {
      console.error("게시물 가져오기 실패:", err.message);
    }
    setLoading(false);
  };

  return (
    <ScreenWrapper bg="white">
      <div style={styles.container}>
        {/* header 부분 */}
        <div style={styles.header}>
          <p style={styles.title}>EekeeK</p>
          <div style={styles.icons}>
            <span
              onClick={() => navigate("/notifications")}
              style={{ cursor: "pointer" }}
            >
              <Icon
                name="Heart"
                size={hp(3.2)} // hp(3.2) 대신 적당한 px값
                strokeWidth={2}
                color={theme.colors.text}
              />
            </span>
            <span
              onClick={() => navigate("/uploadPage")}
              style={{ cursor: "pointer" }}
            >
              <Icon
                name="Plus"
                size={hp(3.2)} // hp(3.2) 대신 적당한 px값
                strokeWidth={2}
                color={theme.colors.text}
              />
            </span>
            <span
              onClick={() => navigate("/profile")}
              style={{ cursor: "pointer" }}
            >
              <Avatar
                src={user?.image}
                alt="User avatar"
                style={{
                  width: "60px", // hp(4.3) 대체값 (적절히 조절 가능)
                  height: "60px",
                  borderRadius: theme.radius?.sm || "8px", // rounded
                  border: "2px solid #ccc", // borderWidth: 2
                  objectFit: "cover", // 비율 유지
                }}
              />
            </span>
          </div>
        </div>

        <PostList
          posts={posts}
          currentUser={user}
          router={router}
          isLoading={loading}
          loadMore={getPosts}
          hasMore={hasMore}
        />

        {/* 게시글 리스트 출력 */}
        <div style={{ padding: "16px" }}>
          {posts.length === 0 ? (
            <p style={styles.noPosts}>아직 게시글이 없습니다.</p>
          ) : (
            posts.map((post) => {
              const converted = {
                ...post,
                file: post.imageUrl || post.videoUrl,
                body: post.content,
              };
              return (
                <PostCard key={post._id} item={converted} currentUser={user} />
              );
            })
          )}
        </div>

        {/* 필요 시 다른 콘텐츠 추가 */}
      </div>
    </ScreenWrapper>
  );
};
export default Home;

export const styles = {
  container: {
    display: "flex",
    flex: 1,

    flexDirection: "column", // 기본 방향 설정
    //paddingLeft: wp(4),
    //paddingRight: wp(4),
  },
  header: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginLeft: wp(4),
    marginRight: wp(4),
  },
  title: {
    color: theme.colors?.text || "#000",
    fontSize: hp(3.2), // hp(3.2) 대체
    fontWeight: theme.fonts?.bold || "bold",
  },
  avatarImage: {
    height: hp(4.3),
    width: hp(4.3),
    borderRadius: theme.radius.sm,
    borderCurve: "continuous",
    borderColor: theme.colors.gray,
    borderWidth: 3,
  },
  icons: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
  },
  listStyle: {
    paddingTop: 20,
    paddingLeft: wp(4),
    paddingRight: wp(4),
  },
  noPosts: {
    fontSize: hp(2),
    textAlign: "center",
    color: theme.colors?.text || "#000",
  },
  pill: {
    position: "absolute",
    right: -10,
    top: -4,
    height: hp(2.2),
    width: hp(2.2),
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: theme.colors?.roseLight || "#fbb6ce",
  },
  pillText: {
    color: "white",
    fontSize: hp(1.2),
    fontWeight: theme.fonts?.bold || "bold",
  },
};
