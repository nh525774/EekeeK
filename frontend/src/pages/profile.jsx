// src/pages/Profile.jsx

import React, { useEffect, useState } from "react";
import ScreenWrapper from "../components/ScreenWrapper";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { theme } from "../constants/theme";
import Icon from "../assets/icons";
import { hp, wp } from "../helpers/common";
import { auth } from "../api/firebase";
import Avatar from "../components/Avatar";
import axios from "axios";
import { auth } from "../api/firebase";

const Profile = () => {
  const navigate = useNavigate();
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

  const user = {
    name: "내 닉네임",
    bio: "안녕하세요! 자기소개입니다.",
    address: "",
    image: "/defaultUser.png",
    followerCount: 45,
    followingCount: 30,
  };

  const handleLogout = async () => {
    const confirmed = window.confirm("정말 로그아웃 하시겠습니까?");
    if (!confirmed) return;
    await onLogout();
  };

  return (
    <ScreenWrapper bg="white">
      <UserHeader user={user} navigate={navigate} handleLogout={handleLogout} />
    </ScreenWrapper>
  );
};

const UserHeader = ({ user, navigate, handleLogout }) => {
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
            uri={user?.image}
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
