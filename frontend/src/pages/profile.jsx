// src/pages/Profile.jsx

import React from "react";
import ScreenWrapper from "../components/ScreenWrapper";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { theme } from "../constants/theme";
import Icon from "../assets/icons";
import { hp, wp } from "../helpers/common";
import { auth } from "../api/firebase";
import Avatar from "../components/Avatar";

const Profile = () => {
  const navigate = useNavigate();
  const onLogout = async () => {
    try {
      await auth.signOut(); // Firebase 로그아웃 수행
      localStorage.removeItem("firebaseToken"); // 저장된 토큰 제거 (있다면)
      console.log("로그아웃 완료");

      // 페이지 이동
      navigate("/");
    } catch (error) {
      console.error("로그아웃 실패:", error.message);
      alert("로그아웃 중 오류가 발생했습니다: " + error.message);
    }
  };

  const user = {
    name: "User",
    // 실제 프로젝트에서는 context나 props로 유저 정보 받아와
  };
  const handleLogout = async () => {
    const confirmed = window.confirm("정말 로그아웃 하시겠습니까?");
    if (!confirmed) {
      console.log("사용자가 취소했음");
      return;
    }

    // 실제 로그아웃 실행
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
      <div style={styles.container}>
        <div style={{ gap: 15 }}>
          <div style={styles.avatarContainer}>
            <Avatar
              uri={user?.image}
              size={hp(12)}
              rounded={theme.radius.xxl * 1.4}
            />
            <div
              onClick={() => navigate("/editProfile")}
              style={styles.editIcon}
            >
              <Icon name="Edit" strokeWidth={2.5} size={20} />
            </div>
          </div>
          {/*username and address*/}
          <div
            style={{
              alignItems: "center",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <p style={styles.userName}>{user && user.name}</p>
            <p style={styles.infoText}>{user && user.address}</p>
          </div>
          {/*email., phon ., bio*/}
          <div
            style={{
              gap: 10,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <p style={{ ...styles.infoText, textAlign: "center" }}>
              {user.bio}
            </p>
          </div>
        </div>
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
};
