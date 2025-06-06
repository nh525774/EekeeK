// src/pages/Profile.jsx

import React from "react";
import ScreenWrapper from "../components/ScreenWrapper";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const Profile = () => {
  const navigate = useNavigate();

  const user = {
    name: "User",
    // 실제 프로젝트에서는 context나 props로 유저 정보 받아와
  };

  return (
    <ScreenWrapper bg="white">
      <UserHeader user={user} navigate={navigate} />
    </ScreenWrapper>
  );
};

const UserHeader = ({ user, navigate }) => {
  return (
    <div style={{ flex: 1, backgroundColor: "white", padding: "16px" }}>
      <div>
        <Header title="profile" showBack />
      </div>
      <div style={{ marginTop: "16px" }}>
        <h2>{user.name}님 환영합니다!</h2>
        <button onClick={() => navigate("/MainPage")}>홈으로</button>
      </div>
    </div>
  );
};

export default Profile;

export const styles = {};
