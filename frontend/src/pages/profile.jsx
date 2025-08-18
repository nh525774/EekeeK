// src/pages/Profile.jsx

import React, { useEffect, useState } from "react";
import ScreenWrapper from "../components/ScreenWrapper";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import { theme } from "../constants/theme";
import Icon from "../assets/icons";
import { hp, wp } from "../helpers/common";
import Avatar from "../components/Avatar";
import axios from "axios";
import { auth } from "../api/firebase";
import { getUserImageSrc } from "../services/imageService";
import { onAuthStateChanged } from "firebase/auth";

const Profile = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null); // {name,bio,image,followingCount,followerCount}
  const [loading, setLoading] = useState(true);
  const { username } = useParams();

  const [isMe, setIsMe] = useState(true);
  const [following, setFollowing] = useState(false);

  const [OwnerId, setOwnerId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);

  // Firebase가 사용자 로딩을 끝낼 때까지 기다림
const waitForUser = (timeoutMs = 3000) =>
  new Promise((resolve) => {
    if (auth.currentUser) return resolve(auth.currentUser);
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(u || null);
    });
    setTimeout(() => {
      try { unsub(); } catch {}
      resolve(null);
    }, timeoutMs);
  });

// 토큰 안전 획득
const withAuth = async () => {
  const u = await waitForUser();
  if (!u) return {}; // 로그인 안 됐으면 빈 헤더(호출 자체를 건너뛰는 용도)
  const token = await u.getIdToken();
  return { headers: { Authorization: `Bearer ${token}` } };
};


  const fetchUserPosts = async (uid) => {
    if (!uid) return;

    try {
      setPostsLoading(true);
      const cfg = await withAuth();
      if (!cfg.headers) { setPosts([]); setPostsLoading(false); return; }
      let res;
      try {
        res = await axios.get(`/api/posts?userId=${uid}`, cfg);
      } catch (e) { 
        res = await axios.get(`/api/posts/user/${uid}`, cfg);
    }
    const list = Array.isArray(res?.data?.data) ? res.data.data : (res?.data || []);
    setPosts(list);
  } catch (e) {
    console.error("사용자 글 로드 실패:", e);
    setPosts([]);
  } finally {
    setPostsLoading(false);
  }
};

const getThumb = (p) => {
  if (!p) return null;
   if (Array.isArray(p.imageUrls) && p.imageUrls[0]) return p.imageUrls[0];
  if (typeof p.imageUrl === "string" && p.imageUrl) return p.imageUrl;
  if (typeof p.image === "string" && p.image) return p.image;
  if (Array.isArray(p.images) && p.images[0]) return p.images[0]?.url || p.images[0];
  if (Array.isArray(p.media) && p.media[0]) return p.media[0]?.url || p.media[0];
  if (Array.isArray(p.files) && p.files[0]) return p.files[0]?.url || p.files[0];

  return null;
};
const toImageUrl = (v) => {
  if (!v) return null;
  if (typeof v === "object")
    v = v.url || v.downloadURL || v.src || v.path || v.location || v.key || null;
  if (!v) return null;
  v = String(v).replace(/\\/g, "/");
  if (/^(https?:|blob:|data:)/i.test(v)) return v;
  return getUserImageSrc(v);
};

  // 내 프로필 불러오기
  const fetchMe = async () => {
    try {
      setLoading(true);
      const cfg = await withAuth();
      if (!cfg.headers) { navigate("/"); return; }
      const { data } = await axios.get("/api/users/me", await withAuth());

  // DB 필드 -> 화면 필드 매핑
      setUser({
        name: data?.username || "",
        bio: data?.bio || "",
        image: data?.profileImageUrl || "/defaultUser.png",
        followerCount: typeof data?.followerCount === "number"
            ? data.followerCount
            : Array.isArray(data?.followers)
            ? data.followers.length
            : 0,
        followingCount:typeof data?.followingCount === "number"
            ? data.followingCount
            : Array.isArray(data?.following)
            ? data.following.length
            : 0,
      });
      setIsMe(true);
      setFollowing(false);
      const myId =data?._id || data?.id;
      setOwnerId(myId || null);
      if (myId) await fetchUserPosts(myId);
    } catch (e) {
      console.error("프로필 로드 실패:", e);
      // 실패해도 화면은 비어 보이지 않게 기본값
      setUser({
        name: "",
        bio: "",
        image: "/defaultUser.png",
        followerCount: 0,
        followingCount: 0,
      });
    } finally {
      setLoading(false);
    }
  };

   // 상대 프로필 불러오기 + 팔로우 상태

const fetchTarget = async () => {
  try {
    setLoading(true);
    const cfg = await withAuth();
    if (!cfg.headers) { navigate("/"); return; }

    // 1) username 으로 사용자 찾기
    const { data: d } = await axios.get(`/api/users/by-username/${username}`, cfg);

    setUser({
      name: d.username || "",
      bio: d.bio || "",
      image: d.profileImageUrl || "/defaultUser.png",
      followerCount: d?.followerCount || 0,
      followingCount: d?.followingCount || 0,
    });

    // user._id 저장해둬야 팔로우/게시글에 씀
    const userId = d._id;
    setOwnerId(userId || null);

    // 2) 팔로우 상태
    const st = await axios.get(`/api/users/${userId}/follow-status`, cfg);
    setIsMe(!!st.data?.isMe);
    setFollowing(!!st.data?.isFollowing);

    // 3) 글 목록
    if (userId) await fetchUserPosts(userId);

  } catch (e) {
    console.error("상대 프로필 로드 실패:", e);
    setUser({ name: "", bio: "", image: "/defaultUser.png", followerCount: 0, followingCount: 0 });
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
   const run = async () => {
    if (username) await fetchTarget();
    else await fetchMe();
   };
    run();

    const onFocus = () => run();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [username]);

  const onLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem("firebaseToken");
      console.log("로그아웃 완료");
      navigate("/");
    } catch (error) {
      console.error("로그아웃 실패:", error.message);
      alert("로그아웃 중 오류가 발생했습니다: " + error.message);
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm("정말 로그아웃 하시겠습니까?");
    if (!confirmed) return;
    await onLogout();
  };

   const toggleFollow = async () => {
    if (!OwnerId || isMe) return;
    const cfg = await withAuth();

    setFollowing((prev) => !prev);
    setUser((prev) =>
    prev
    ? {
      ...prev,
      followerCount: prev.followerCount + (following ? -1 : +1),
    }
  : prev
);

try {
      const { data } = !following
        ? await axios.post(`/api/users/${OwnerId}/follow`, null, cfg)
        : await axios.post(`/api/users/${OwnerId}/unfollow`, null, cfg);

      // 서버 스냅샷 기준 동기화(안정)
      if (typeof data?.followerCount === "number") {
        setUser((prev) => (prev ? { ...prev, followerCount: data.followerCount } : prev));
      }
    } catch (e) {
      // 롤백
      setFollowing((prev) => !prev);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              followerCount: prev.followerCount + (following ? +1 : -1),
            }
          : prev
      );
      alert("팔로우 처리 실패");
    }
  };

  if (loading || !user) {
    return (
      <ScreenWrapper bg="white">
        <div style={{ padding: 16 }}>로딩 중...</div>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper bg="white">
      <UserHeader user={user} navigate={navigate} handleLogout={async () => {
          const confirmed = window.confirm("정말 로그아웃 하시겠습니까?");
          if (!confirmed) return;
          try {
            await auth.signOut();
            localStorage.removeItem("firebaseToken");
            navigate("/");
          } catch (error) {
            console.error("로그아웃 실패:", error.message);
            alert("로그아웃 중 오류가 발생했습니다: " + error.message);
          }
        }} isMe={isMe} 
      following={following} onToggleFollow={toggleFollow} />
      {/* ----- 내/상대 게시글 그리드 ----- */}
      <div style={styles.gridWrap}>
        {postsLoading ? (
          <div style={styles.gridEmpty}>게시글 불러오는 중…</div>
        ) : posts.length === 0 ? (
          <div style={styles.gridEmpty}>아직 게시글이 없어요</div>
        ) : (
          <div style={styles.grid}>
            {posts.map((p) => {
              const id = p?._id || p?.id;
              const src = toImageUrl(getThumb(p));
              return (
                <div
                  key={id}
                  style={styles.gridItem}
                  onClick={() => navigate(`/postDetail?postId=${id}`)}
                >
                  {src ? (
                    <img src={src} alt="" style={styles.gridImg} />
                  ) : (
                    <div style={styles.gridPlaceholder} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ScreenWrapper>
  );
};

const UserHeader = ({ user, navigate, handleLogout, isMe, following, onToggleFollow }) => {
  const displayImage = user?.image?.startsWith("http") || user?.image?.startsWith("blob:")
  ? user.image
  : getUserImageSrc(user?.image);

  return (
    <div style={{ flex: 1, backgroundColor: "white", padding: "16px" }}>
      <div className="mb-8">
        <Header
          title="profile"
          showBack
          rightComponent={
            <div
              onClick={handleLogout}
              className="cursor-pointer hover:opacity-70 transition-opacity"
            >
              <Icon name="logout" color={theme.colors.hotpink} />
            </div>
          }
        />
      </div>

      {/* 중앙 정렬 블록: 아바타 + 닉네임 + 자기소개 */}
      <div style={styles.centerBlock}>
        <div style={styles.avatarContainer}>
          <Avatar
          key={displayImage}
            uri={displayImage}
            size={hp(12)}
            rounded={theme.radius.xxl * 1.4}
          />
          {/* 내 프로필일 때만 편집 버튼 표시 */}
          {isMe && (
            <div onClick={() => navigate("/editProfile")} style={styles.editIcon}>
              <Icon name="edit" strokeWidth={2.5} size={20} />
            </div>
          )}
        </div>

        <p style={styles.userName}>{user.name}</p>

        {/*  자기소개 중앙 정렬 */}
        <p style={{ ...styles.infoText, textAlign: "center", marginTop: 4 }}>
          {user.bio}
        </p>
      </div>

      {/* 팔로잉 / 팔로워 + 팔로우 버튼 */}
      <div style={styles.followRow}>
        {/* 팔로잉 / 팔로워 */}
        <div style={styles.followNumbers}>
          <p>
            following <b>{user.followingCount}</b>
          </p>
          <p>
            follower <b>{user.followerCount}</b>
          </p>
        </div>

         {/* 상대 프로필에서만 버튼 노출, 내 프로필이면 숨김 (기존 위치에 조건만 추가) */}
        { !isMe ? (
          <button style={styles.followButton} onClick={onToggleFollow}>
            {following ? "언팔로우" : "팔로우"}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default Profile;

export const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center", // ← 세로 중앙
    flexDirection: "column",
    marginTop: hp(5), // ← 상단과의 간격 조절 (선택)
  },
  avatarContainer: {
    position: "relative",
    height: hp(12),
    width: hp(12),
  },

  editIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    padding: 7,
    borderRadius: 50,
    backgroundColor: "white",
    boxShadow: "0px 4px 5px rgba(0,0,0,0.4)",
    cursor: "pointer",
  },

  userName: {
    fontSize: hp(3),
    fontWeight: "500",
    color: theme.colors.textDark,
  },

  info: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    fontSize: hp(1.6),
    fontWeight: "500",
    color: theme.colors.textLight,
  },

  logoutButton: {
    position: "absolute",
    right: 0,
    padding: 5,
    borderRadius: theme.radius.sm,
    backgroundColor: "#fee2e2",
  },

  listStyle: {
    paddingHorizontal: wp(4),
    paddingBottom: 30,
  },

  noPosts: {
    fontSize: hp(2),
    textAlign: "center",
    color: theme.colors.text,
  },
  centerBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center", // 중앙 정렬
    marginTop: hp(4),
    gap: 8,
  },

  leftBlock: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start", // 왼쪽 정렬
    padding: "0 20px",
    marginTop: 12,
    gap: 4,
  },

  followSection: {
    display: "flex",
    justifyContent: "flex-start",
    gap: 16,
    fontSize: hp(1.6),
    fontWeight: "500",
    color: theme.colors.textDark,
  },
  followRow: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between", // 좌우 배치
    alignItems: "center",
    padding: "0 20px",
    marginTop: 12,
  },

  followNumbers: {
    display: "flex",
    gap: 16,
    fontSize: hp(1.6),
    fontWeight: "500",
    color: theme.colors.textDark,
  },

  followButton: {
    backgroundColor: theme.colors.hotpink,
    color: "white",
    border: "none",
    borderRadius: 20,
    padding: "4px 12px",
    fontWeight: "bold",
    cursor: "pointer",
    minWidth: 80,
    textAlign: "center",
  },
  //그리드
  gridWrap: {
    width: "100%",
    padding: "12px 8px 40px",
  },
   grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 2,
  },
  gridItem: {
    width: "100%",
    aspectRatio: "1 / 1",      // 정사각형
    overflow: "hidden",
    cursor: "pointer",
    borderRadius: 6,
  },
  gridImg: {
      width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  gridEmpty: {
    padding: "24px 0",
    textAlign: "center",
    color: theme.colors.textLight,
    fontSize: hp(1.8),
  },
  gridPlaceholder: { width:"100%", height:"100%", background:"#f3f3f3" },

};
