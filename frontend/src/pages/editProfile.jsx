import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ScreenWrapper from "../components/ScreenWrapper.jsx";
import Header from "../components/Header.jsx";
import { useAuth } from "../contexts/authContext.jsx";
import { getUserImageSrc } from "../services/imageService.js";
import Icon from "../assets/icons/index.jsx";
import { theme } from "../constants/theme.js";
import { hp, wp } from "../helpers/common.js";
import Input from "../components/Input.jsx";
import axios from "axios";
import { auth } from "../api/firebase";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user: currentUser, loading } = useAuth();

  const [form, setForm] = useState({
    name: "",
    image: "",
    bio: "",
  });
  const [saving, setSaving] = useState(false);

  // 1) 서버에서 내 프로필 불러와 폼 초기화
  useEffect(() => {
    const init = async () => {
      try {
        if (!auth.currentUser) return;
        const token = await auth.currentUser.getIdToken();
         const { data } = await axios.get("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
      });
      setForm({
        name: data?.username ?? currentUser?.username ?? "",
          image: data?.profileImageUrl ?? currentUser?.profileImageUrl ?? "",
          bio: data?.bio ?? "",
      });
    } catch {
      // DB에 아직 없으면 Auth 기본값만 넣어둠
        setForm({
          name: currentUser?.username ?? "",
          image: currentUser?.profileImageUrl ?? "",
          bio: "",
        });
    }
  };
init();
  }, [currentUser]);

  const onSave = async () => {
  try {
    setSaving(true);
    const token = await auth.currentUser.getIdToken();
    const body = {
        username: form.name,
        bio: form.bio,
        profileImageUrl: form.image || "",
      };
    const res = await axios.patch(
      "/api/users/me", body, 
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("saved:", res.data);
    alert("프로필이 저장됐습니다 ✅");
    navigate("/profile");
  } catch (e) {
    console.error(e);
    alert("저장 실패 😥");
  } finally {
    setSaving(false);
  }
};

if (loading) return <p>로딩 중...</p>;

  const imageSource = getUserImageSrc(form.image);

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
        {/* 폼 */}
        <div style={styles.form}>
          <p style={{ fontSize: hp(1.5), color: theme.colors.text }}>
            Please fill your profile details
          </p>
        </div>
        <Input
          icon={<Icon name="User"></Icon>}
          placeholder="Enter your name"
          value={form.name}
          onChange={(value) => setForm({ ...form, name: value })}
        />
        <Input
          icon={<Icon name="Edit"></Icon>}
          placeholder="Enter your bio"
          value={form.bio}
          multiline={true}
          onChange={(value) => setForm({ ...form, bio: value })}
        />
        <button
  style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, background: theme.colors.hotpink, color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1, }}
  disabled={saving}
  onClick={onSave}
>
  {saving ? "저장 중..." : "저장"}  
        </button>
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
