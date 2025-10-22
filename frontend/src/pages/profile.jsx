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

/* ---------------------------------------------
 * eekrew 버튼들
 *  - EekrewSelfButton: 내 프로필에서 목록으로 이동
 *  - EekrewToggleButton: 남의 프로필에서 내 eekrew에 추가/제거
 * --------------------------------------------- */

function EekrewSelfButton({ onClick, compact = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: compact ? "6px 10px" : "8px 14px",
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        fontWeight: 700,
        background: "#ECFDF5",
        color: "#14532d",
        boxShadow: "0 1px 6px rgba(16,185,129,.25)",
        cursor: "pointer",
      }}
    >
      eekrew
    </button>
  );
}

function EekrewToggleButton({ targetUserId, getAuthHeaders, compact = false }) {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);

  // 최초 상태 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cfg = await getAuthHeaders();
        if (!cfg.headers) return;
        const { data } = await axios.get(`/api/eekrew/is/${targetUserId}`, cfg);
        if (mounted) setActive(!!data?.inEekrew);
      } catch (err) {
        console.error("eekrew 상태 조회 실패:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [targetUserId, getAuthHeaders]);

  const onToggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const cfg = await getAuthHeaders();
      if (!cfg.headers) return;
      const { data } = await axios.post(
        `/api/eekrew/toggle/${targetUserId}`,
        null,
        cfg
      );
      setActive(!!data?.inEekrew);
    } catch (err) {
      console.error("eekrew 토글 실패:", err);
      alert("eekrew 처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={onToggle}
      disabled={loading}
      title={active ? "내 eekrew에서 제거" : "내 eekrew에 추가"}
      style={{
        padding: compact ? "6px 10px" : "8px 14px",
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        fontWeight: 700,
        background: active ? "#ECFDF5" : "#fff", // 채움/비활성
        color: active ? "#14532d" : "#111827",
        boxShadow: active ? "0 1px 6px rgba(16,185,129,.25)" : "none",
        opacity: loading ? 0.6 : 1,
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      eekrew
    </button>
  );
}

/* --------------------------------------------- */
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

   const isVideoUrl = (u) => /\.(mp4|webm|ogg)(\?.*)?$/i.test(String(u || ""));

  // Firebase가 사용자 로딩을 끝낼 때까지 기다림
  const waitForUser = (timeoutMs = 3000) =>
    new Promise((resolve) => {
      if (auth.currentUser) return resolve(auth.currentUser);
      const unsub = onAuthStateChanged(auth, (u) => {
        unsub();
        resolve(u || null);
      });
      setTimeout(() => {
        try {
          unsub();
        } catch (e) {
          console.error(e);
        }
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
      if (!cfg.headers) {
        setPosts([]);
        setPostsLoading(false);
        return;
      }
      let res;
      try {
        res = await axios.get(`/api/posts?userId=${uid}`, cfg);
      } catch (e) {
        res = await axios.get(`/api/posts/user/${uid}`, cfg);
      }
      const raw = Array.isArray(res?.data?.data)
        ? res.data.data
        : res?.data || [];
      const filtered = (raw || []).filter((p) => {
        const author =
          p?.userId || p?.user?._id || p?.user?.id || p?.user?._id?.$oid;
        return author && String(author) === String(uid);
      });
      setPosts(filtered);
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
    if (Array.isArray(p.images) && p.images[0])
      return p.images[0]?.url || p.images[0];
    if (Array.isArray(p.media) && p.media[0])
      return p.media[0]?.url || p.media[0];
    if (Array.isArray(p.files) && p.files[0])
      return p.files[0]?.url || p.files[0];
    if (typeof p.videoUrl === "string" && p.videoUrl) return p.videoUrl;
    if (typeof p.video === "string" && p.video) return p.video;
    if (typeof p.processedVideoUrl === "string" && p.processedVideoUrl) return p.processedVideoUrl;
    // 본문에 경로가 들어있는 케이스(예: content가 /uploads/...mp4)
    if (typeof p.content === "string" && /\.(mp4|webm|ogg)(\?.*)?$/i.test(p.content)) return p.content;
    return null;
  };
  const toMediaUrl = (v) => {
   if (!v) return null;
   if (typeof v === "object") {
     v = v.url || v.downloadURL || v.src || v.path || v.location || v.key || null;
   }
   if (!v) return null;
   v = String(v).replace(/\\/g, "/");
   if (/^(https?:|blob:|data:)/i.test(v)) return v; // 절대/blob/data 그대로
   const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
   const path = v.startsWith("/") ? v : `/${v}`;     // /uploads/... 보장
   return baseUrl + path;                            // 백엔드 프록시로 이동
 };

  // 내 프로필 불러오기
  const fetchMe = async () => {
    try {
      setLoading(true);
      const cfg = await withAuth();
      if (!cfg.headers) {
        navigate("/");
        return;
      }
      const { data } = await axios.get("/api/users/me", await withAuth());

      // DB 필드 -> 화면 필드 매핑
      setUser({
        name: data?.username || "",
        bio: data?.bio || "",
        image: data?.profileImageUrl || "/defaultUser.png",
        followerCount:
          typeof data?.followerCount === "number"
            ? data.followerCount
            : Array.isArray(data?.followers)
            ? data.followers.length
            : 0,
        followingCount:
          typeof data?.followingCount === "number"
            ? data.followingCount
            : Array.isArray(data?.following)
            ? data.following.length
            : 0,
      });
      setIsMe(true);
      setFollowing(false);
      const myId = data?._id || data?.id;
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
      if (!cfg.headers) {
        navigate("/");
        return;
      }

      // 1) username 으로 사용자 찾기
      const { data: d } = await axios.get(
        `/api/users/by-username/${username}`,
        cfg
      );

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

      // ✅ 팔로우 알림 (팔로우할 때만)
      if (!following) {
        await axios.post(
          "/api/notifications",
          {
            receiverId: OwnerId,
            message: "회원님을 팔로우하기 시작했습니다.",
            type: "follow",
            data: { userId: OwnerId },
          },
          cfg
        );
      }

      // 서버 스냅샷 기준 동기화(안정)
      if (typeof data?.followerCount === "number") {
        setUser((prev) =>
          prev ? { ...prev, followerCount: data.followerCount } : prev
        );
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
      <UserHeader
        user={user}
        navigate={navigate}
        handleLogout={async () => {
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
        }}
        isMe={isMe}
        following={following}
        onToggleFollow={toggleFollow}
        ownerId={OwnerId} // ✅ 추가
        getAuthHeaders={withAuth}
      />
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
              const raw = getThumb(p);
              const src = toMediaUrl(raw)
              return (
                <div
                  key={id}
                  style={styles.gridItem}
                  onClick={() => navigate(`/postDetail?postId=${id}`)}
                >
                  {src ? (
                    isVideoUrl(raw) ? (
                     <div style={{position:"relative"}}>
       <video
         src={src}
         style={styles.gridImg}
         preload="metadata"
         playsInline
         muted
         onError={()=>console.warn("video thumb load error:", src)}
       />
       {/* 재생 아이콘 살짝 오버레이 (선택) */}
       <div style={{
         position:"absolute", right:6, bottom:6,
         background:"rgba(0,0,0,.55)", color:"#fff",
         fontSize:10, padding:"2px 6px", borderRadius:6
       }}>VIDEO</div>
     </div>
   ) : (
     <img
       src={src}
       alt=""
       style={styles.gridImg}
       onError={()=>console.warn("img thumb load error:", src)}
     />
   )
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

const UserHeader = ({
  user,
  navigate,
  handleLogout,
  isMe,
  following,
  onToggleFollow,
  ownerId, // ✅ 추가
  getAuthHeaders, // ✅ 추가
}) => {
  const displayImage =
    user?.image?.startsWith("http") || user?.image?.startsWith("blob:")
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
              <Icon name="logout" color={theme.colors.text} />
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
            <div
              onClick={() => navigate("/editProfile")}
              style={styles.editIcon}
            >
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

        {/* 오른쪽 액션 영역 */}
        {isMe ? (
          <EekrewSelfButton onClick={() => navigate("/eekrew")} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* ✅ 팔로우 중일 때만 eekrew 토글 버튼 노출 */}
            {following && (
              <EekrewToggleButton
                compact
                targetUserId={ownerId}
                getAuthHeaders={getAuthHeaders}
              />
            )}
            <button style={styles.followButton} onClick={onToggleFollow}>
              {following ? "언팔로우" : "팔로우"}
            </button>
          </div>
        )}
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
    aspectRatio: "1 / 1", // 정사각형
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
  gridPlaceholder: { width: "100%", height: "100%", background: "#f3f3f3" },
};
