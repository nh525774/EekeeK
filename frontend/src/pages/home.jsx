import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import ScreenWrapper from "../components/ScreenWrapper";
import { theme } from "../constants/theme";
import { hp, wp } from "../helpers/common";
import Icon from "../assets/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/authContext";
import PostList from "../components/postList";
import { fetchPosts } from "../services/postService";
import { auth } from "../api/firebase";
import { getUserImageSrc } from "../services/imageService";

let limit = 5;

const Home = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // 내 프로필(이미지/이름) 최신값
  const [me, setMe] = useState(null);

  // 최신 내 프로필 불러오기
const fetchMe = useCallback(async () => {
    try {
      if (!auth.currentUser) return;
      const token = await auth.currentUser.getIdToken();
      const { data } = await axios.get("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMe({
        id:   data?._id,  
        name: data?.username || "",
        image: data?.profileImageUrl || "",
      });
    } catch (e) {
      // 실패해도 기본 이미지/이름으로 진행
      setMe({
        id: null,
        name: authUser?.username || authUser?.name || "",
        image: authUser?.profileImageUrl || authUser?.image || "",
      });
    }
  }, [authUser]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // 포커스 돌아올 때도 최신값으로 (프로필 수정 후 뒤로 왔을 때)
  useEffect(() => {
    const onFocus = () => fetchMe();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchMe]);

  // 초기/더보기 포스트 로드 (모양 통일)
  const load = async (lim) => {
    setLoading(true);
    try {
      const res = await fetchPosts(lim); // { success, data: [...] }
      const arr = Array.isArray(res?.data) ? res.data : [];
      setPosts(arr);
      setHasMore(arr.length >= lim);
    } catch (err) {
      console.error("게시글 로드 실패:", err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(limit);
  }, []);

  const getPosts = async () => {
    if (!hasMore || loading) return;
    const next = limit + 5;
    await load(next);   // 전체를 최신 limit로 다시 세팅 (중복 방지)
    limit = next;
  };

  const headerName =
    me?.name || authUser?.username || authUser?.name || "User";

  const avatarUrl = getUserImageSrc(
    me?.image ||
      authUser?.profileImageUrl ||
      authUser?.image ||
      "/defaultUser.png"
  );

  return (
    <ScreenWrapper bg="white">
      <div style={styles.container}>
        {/* header */}
        <div style={styles.header}>
          <p style={styles.title}>EekeeK</p>
          <div style={styles.icons}>
            <span onClick={() => navigate("/search")} style={{ cursor: "pointer" }}>
              <Icon name="Search" size={hp(3.2)} strokeWidth={2} color={theme.colors.text} />
            </span>
            <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}>
              <Icon name="Heart" size={hp(3.2)} strokeWidth={2} color={theme.colors.text} />
            </span>
            <span onClick={() => navigate("/uploadPage")} style={{ cursor: "pointer" }}>
              <Icon name="Plus" size={hp(3.2)} strokeWidth={2} color={theme.colors.text} />
            </span>
            <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>
              <img
              key={avatarUrl}
                src={avatarUrl}
                alt="User avatar"
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: theme.radius?.sm || 8,
                  border: "2px solid #ccc",
                  objectFit: "cover",
                }}
              />
              <span style={{ fontWeight: 600 }}>{headerName}</span>
            </span>
          </div>
        </div>

        <PostList
          posts={posts}
          currentUser={authUser}
          navigate={navigate}
          isLoading={loading}
          loadMore={getPosts}
          hasMore={hasMore}
          meId={me?.id}
        />
      </div>
    </ScreenWrapper>
  );
};

export default Home;

const styles = {
  container: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
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
    fontSize: hp(3.2),
    fontWeight: theme.fonts?.bold || "bold",
  },
  icons: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
  },
};

