import React, { useEffect, useRef, useState } from "react";
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
  const { user: currentUser, loading, refreshUser } = useAuth();

  const [form, setForm] = useState({ name: "", image: "", bio: "" });
  const [saving, setSaving] = useState(false);

  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

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

  const onPickImage = () => fileInputRef.current?.click();

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const preview = URL.createObjectURL(f);
    setForm((p) => ({ ...p, image: preview })); // 미리보기
  };

  const onSave = async () => {
    try {
      setSaving(true);
      const token = await auth.currentUser.getIdToken();

      // 1) 이미지 먼저 업로드해서 URL 받기
      let uploadedUrl = form.image;
      if (file) {
        const fd = new FormData();
        fd.append("avatar", file);
        const upRes = await axios.post("/api/users/me/avatar", fd, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        uploadedUrl = upRes.data.url; // 서버가 돌려준 공개 URL
        setForm((p) => ({ ...p, image: uploadedUrl })); // 상태도 HTTP URL로 갱신
      }
      // 2) 이름/바이오 + 이미지 URL PATCH
      await axios.patch(
        "/api/users/me",
        { username: form.name, bio: form.bio, profileImageUrl: uploadedUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await refreshUser();

      alert("프로필이 저장됐습니다 ✅");
      navigate("/profile");
    } catch (e) {
      console.error(e);
      alert("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>로딩 중...</p>;

  const imageSource = form.image?.startsWith("blob:")
    ? form.image
    : form.image?.startsWith("http")
    ? form.image
    : getUserImageSrc(form.image);

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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          style={{ display: "none" }}
        />
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
          style={{
            marginTop: 16,
            padding: "12px 16px",
            borderRadius: 12,
            background: theme.colors.primary,
            color: "#fff",
            border: "none",
            fontWeight: 700,
            cursor: "pointer",
            opacity: saving ? 0.7 : 1,
            boxShadow: "0px 5px 4px rgba(0, 0, 0, 0.2)",
          }}
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
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
  },
  container: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    paddingHorizontal: wp(4),
  },
  centerBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
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
