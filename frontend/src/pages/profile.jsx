// src/pages/Profile.jsx

import React, { useEffect, useState } from "react";
import ScreenWrapper from "../components/ScreenWrapper";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { theme } from "../constants/theme";
import Icon from "../assets/icons";
import { hp, wp } from "../helpers/common";
import Avatar from "../components/Avatar";
import axios from "axios";
import { auth } from "../api/firebase";
import { getUserImageSrc } from "../services/imageService";

const Profile = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null); // {name,bio,image,followingCount,followerCount}
  const [loading, setLoading] = useState(true);


  const fetchMe = async () => {
    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();
      const { data } = await axios.get("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
  });

  // DB 필드 -> 화면 필드 매핑
      setUser({
        name: data?.username || "",
        bio: data?.bio || "",
        image: data?.profileImageUrl || "/defaultUser.png",
        followerCount: Array.isArray(data?.followers) ? data.followers.length : 0,
        followingCount: Array.isArray(data?.following) ? data.following.length : 0,
      });
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

  useEffect(() => {
    fetchMe();
    // 편집 후 뒤로 오거나 포커스 돌아올 때 새로고침
    const onFocus = () => fetchMe();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
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

  if (loading || !user) {
    return (
      <ScreenWrapper bg="white">
        <div style={{ padding: 16 }}>로딩 중...</div>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper bg="white">
      <UserHeader user={user} navigate={navigate} handleLogout={handleLogout} />
    </ScreenWrapper>
  );
};

const UserHeader = ({ user, navigate, handleLogout }) => {
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
          <div onClick={() => navigate("/editProfile")} style={styles.editIcon}>
            <Icon name="Edit" strokeWidth={2.5} size={20} />
          </div>
        </div>

        <p style={styles.userName}>{user.name}</p>

        {/* ✅ 자기소개 중앙 정렬 */}
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

        {/* 팔로우 버튼 */}
        <button style={styles.followButton}>팔로우</button>
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
};
