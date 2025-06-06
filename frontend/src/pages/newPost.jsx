import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ScreenWrapper from "../components/ScreenWrapper";
import Header from "../components/Header";
import { styles } from "../constants/styles";
import { hp } from "../helpers/common";
import { theme } from "../constants/theme";
import Avatar from "../components/Avatar";
import RichTextEditor from "../components/RichTextEditor";
import { auth } from "../api/firebase.js";
import Button from "../components/Button";
import Icon from "../assets/icons";
import { createOrUpdatePost } from "../services/postService";

const NewPost = () => {
  const navigate = useNavigate();
  const bodyRef = useRef("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [title] = useState("");

  const user = auth.currentUser;
  if (!user) {
    return (
      <ScreenWrapper bg="white">
        <Header title="Create Post" />
        <div style={{ padding: "32px", textAlign: "center" }}>
          <p style={{ color: theme.colors.text }}>로그인이 필요합니다.</p>
        </div>
      </ScreenWrapper>
    );
  }
  //임시
  /*const user = {
    photoURL: "/default-profile.png",
    displayName: "게스트",
    uid: "test-user", 
}; */

  const onFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const getFileType = (file) => {
    if (!file) return null;
    return file.type.includes("video") ? "video" : "image";
  };

  const getFileUrl = (file) => {
    if (!file) return null;
    return URL.createObjectURL(file);
  };

  const onSubmit = async () => {
    if (!bodyRef.current && !file) {
      alert("Please add content or attach a file.");
      return;
    }

    const post = {
      title: title || "무제",
      content: "", // 이미지 URL로 대체됨
      file,
    };

    // create post
    setLoading(true);
    let res = await createOrUpdatePost(post);
    setLoading(false);

    if (res.success) {
      setFile(null);
      bodyRef.current = "";
      navigate(-1);
    } else {
      alert("Post failed:" + res.msg);
    }
  };

  return (
    <ScreenWrapper bg="white">
      <Header title="Create Post" />
      <div
        style={{ ...styles.loginContainer, gap: "28px", paddingTop: "32px" }}
      >
        {/* 프로필 */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Avatar
            uri={user?.photoURL}
            size={hp(6.5)}
            rounded={theme.radius.xl}
          />
          <div>
            <p style={{ fontWeight: theme.fonts.semibold }}>
              {user?.displayName || "User"}
            </p>
            <p style={{ fontSize: hp(1.6), color: theme.colors.textLight }}>
              Public
            </p>
          </div>
        </div>
        {file && (
          <div style={{ position: "relative" }}>
            {getFileType(file) === "video" ? (
              <video
                src={getFileUrl(file)}
                controls
                style={{ width: "100%", borderRadius: "12px" }}
              />
            ) : (
              <img
                src={getFileUrl(file)}
                alt="preview"
                style={{
                  display: "block",
                  margin: "0 auto",
                  width: "100%",
                  height: "auto",
                  maxWidth: "300px",
                  objectFit: "contain",
                  borderRadius: "12px",
                }}
              />
            )}
            <button
              onClick={() => setFile(null)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                backgroundColor: "rgba(255, 0, 0, 0.6)",
                borderRadius: "50%",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                width: "32px",
                height: "32px",
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* 글쓰기 입력창 */}
        <RichTextEditor
          editorRef={bodyRef}
          onChange={(val) => {
            bodyRef.current = val;
          }}
        />

        {/* 업로드 */}
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <label htmlFor="fileUpload" style={{ cursor: "pointer" }}>
            <Icon name="Image" size={28} />
          </label>
          <input
            id="fileUpload"
            type="file"
            accept="image/*, video/*"
            onChange={onFileChange}
            style={{ display: "none" }}
          />
          <span style={{ color: theme.colors.textLight }}>
            Add to your post
          </span>
        </div>

        {/* 제출 */}
        <Button title="Post" onPress={onSubmit} loading={loading} />
      </div>
    </ScreenWrapper>
  );
};

export default NewPost;
