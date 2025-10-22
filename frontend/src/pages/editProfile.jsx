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

  // 내 프로필 불러오기
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
    setForm((p) => ({ ...p, image: preview }));
  };

  const onSave = async () => {
    try {
      setSaving(true);
      const token = await auth.currentUser.getIdToken();

      let uploadedUrl = form.image;
      if (file) {
        const fd = new FormData();
        fd.append("avatar", file);
        const upRes = await axios.post("/api/users/me/avatar", fd, {
          headers: { Authorization: `Bearer ${token}` },
        });
        uploadedUrl = upRes.data.url;
        setForm((p) => ({ ...p, image: uploadedUrl }));
      }

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
        <Header title="Edit Profile" showBack />

        {/* 아바타 영역 */}
        <div style={styles.centerBlock}>
          <div style={styles.avatarContainer}>
            <img src={imageSource} alt="User Avatar" style={styles.avatar} />
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

        {/* 설명 */}
        <div style={styles.form}>
          <p style={{ fontSize: hp(1.5), color: theme.colors.text }}>
            Please fill your profile details
          </p>
        </div>

        {/* ✅ modern style 입력칸들 */}
        <div className="space-y-3 mt-3">
          <div className="card-glass shadow-soft rounded-2xl p-3">
            <Input
              icon={<Icon name="User" />}
              placeholder="Enter your name"
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
            />
          </div>

          <div className="card-glass shadow-soft rounded-2xl p-3">
            <Input
              icon={<Icon name="Edit" />}
              placeholder="Enter your bio"
              value={form.bio}
              multiline={true}
              onChange={(value) => setForm({ ...form, bio: value })}
            />
          </div>
        </div>

        {/* ✅ modern style 저장 버튼 */}
        <button
          className="btn-ghost shadow-soft rounded-xl"
          style={{
            marginTop: 16,
            width: "100%",
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid hsl(var(--border))",
            background: "#00C5C5",
            color: "hsl(var(--foreground))",
            fontWeight: 700,
            cursor: "pointer",
            opacity: saving ? 0.7 : 1,
            transition: "transform 0.1s ease, background 0.2s ease",
          }}
          disabled={saving}
          onClick={onSave}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </ScreenWrapper>
  );
};

export default EditProfile;

const styles = {
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
    cursor: "pointer",
  },
  form: {
    gap: 18,
    marginTop: 20,
  },
};
