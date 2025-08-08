import React, { useEffect, useState } from "react";
import ScreenWrapper from "../components/ScreenWrapper.jsx";
import Header from "../components/Header.jsx";
import { useAuth } from "../contexts/authContext.jsx";
import { getUserImageSrc } from "../services/imageService.js";
import Icon from "../assets/icons/index.jsx";
import { theme } from "../constants/theme.js";
import { hp, wp } from "../helpers/common.js";

const EditProfile = () => {
  const { user: currentUser, loading } = useAuth();

  const { user, setUser } = useState({
    name: "",
    image: null,
    bio: "",
  });

  useEffect(() => {
    if (currentUser) {
      setUser({
        name: currentUser.name || "",
        image: currentUser.image || "",
        bio: currentUser.bio || "",
      });
    }
  }, [currentUser]);

  if (loading) return <p>로딩 중...</p>;
  if (!user) return <p>로그인이 필요합니다.</p>;

  const imageSource = getUserImageSrc(user.image);

  const onPickImage = () => {
    console.log("이미지 선택 실행");
  };

  return (
    <ScreenWrapper bg="white">
      <div style={{ flex: 1, backgroundColor: "white", padding: "16px" }}>
        {/* Header */}
        <Header title="Edit Profile" showBack />

        {/* 중앙 정렬 블록 */}
        <div style={styles.centerBlock}>
          <div style={styles.avatarContainer}>
            <img src={imageSource} alt="User Avatar" style={styles.avatar} />

            {/* 카메라 버튼 */}
            <div style={styles.cameraIcon} onClick={onPickImage}>
              <Icon name="Camera" size={20} strokeWidth={2.5} />
            </div>
          </div>
        </div>
        <div style={styles.form}>
          <p style={{ fontSize: hp(1.5), color: theme.colors.text }}>
            Please fill your frofile details
          </p>
        </div>
        <Input
          icon={<Icon name="User"></Icon>}
          placeholder="Enter your name"
          value={user.name}
          onChangeText={(value) => setUser({ ...user, name: value })}
        />
        <Input
          icon={<Icon name="Edit"></Icon>}
          placeholder="Enter your bio"
          value={user.bio}
          multiline={true}
          onChangeText={(value) => setUser({ ...user, bio: value })}
        />
      </div>
    </ScreenWrapper>
  );
};

export default EditProfile;
const styles = {
  scrollArea: {
    flex: 1,
    overflowY: "auto", // 🔥 ScrollView 역할
    display: "flex",
    flexDirection: "column",
  },
  contentWrapper: {
    flex: 1,
    display: "flex",
    justifyContent: "center", // 🔥 세로 중앙
    alignItems: "center", // 🔥 가로 중앙
    minHeight: "100vh", // 화면 꽉 차게
  },
  container: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    alignItems: "center", // 가로 중앙
    justifyContent: "center", // 세로 중앙
    height: "100%", // 세로 높이 확보
    paddingHorizontal: wp(4),
  },
  centerBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center", // 🔥 중앙정렬
    marginTop: hp(4),
    gap: 8,
  },
  avatarContainer: {
    position: "relative",
    height: hp(12),
    width: hp(12),
  },
  avatar: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: theme.radius.xxl * 1.8,
    borderCurve: "continuous",
    border: "2.5px solid " + theme.colors.darkLight,
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: -10,
    padding: 8,
    borderRadius: "50%",
    backgroundColor: "white",
    boxShadow: "0 8px 8px rgba(0, 0, 0, 0.2)",
    border: "none",
    cursor: "pointer",
  },

  icons: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
  },

  form: {
    gap: 18,
    marginTop: 20,
  },
  input: {
    flexDirection: "row",
    borderWidth: 0.4,
    borderColor: theme.colors.text,
    borderRadius: theme.radius.xxl,
    borderCurve: "continous",
    padding: 17,
    paddingHoriozontal: 20,
    gap: 15,
  },
  bio: {
    flexDirection: "row",
    alignItems: "flex-start",
    height: hp(15),
    paddingVertical: 15,
  },
};
