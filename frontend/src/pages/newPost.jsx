import React, { useRef, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const bodyRef = useRef("");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [title] = useState("");

  // ✅ EditMosaic에서 돌아왔을 때 해당 인덱스에 파일 교체
  useEffect(() => {
    const updatedFile = location.state?.updatedFile;
    const index = location.state?.index;

    if (updatedFile != null && typeof index === "number") {
      setFiles((prevFiles) => {
        const updated = [...prevFiles];
        updated[index] = updatedFile;
        return updated;
      });
    }
  }, [location.state]);

  const user = auth.currentUser;
  if (!user) {
    return (
      <ScreenWrapper bg="white">
        <Header title="Create Post" showBack />
        <div style={{ padding: "32px", textAlign: "center" }}>
          <p style={{ color: theme.colors.text }}>로그인이 필요합니다.</p>
        </div>
      </ScreenWrapper>
    );
  }

  const onFileChange = async (e) => {
    const selected = Array.from(e.target.files || []);
    const remainingSlots = 4 - files.length;
    if (remainingSlots <= 0) {
      alert("최대 4개의 파일만 업로드할 수 있습니다.");
      return;
    }

    const selectedLimited = selected.slice(0, remainingSlots);
    if (selectedLimited.length === 0) return;

    setFiles((prev) => [...prev, ...selectedLimited]);
  };

  const onSubmit = async () => {
    if (!bodyRef.current && files.length === 0) {
      alert("Please add content or attach a file.");
      return;
    }

    const post = {
      title: title || "무제",
      content: bodyRef.current || "",
      files: files,
    };

    setLoading(true);
    const res = await createOrUpdatePost(post);
    setLoading(false);

    if (res.success) {
      setFiles([]);
      bodyRef.current = "";
      navigate(-1);
    } else {
      alert("Post failed: " + res.msg);
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

        {/* 썸네일 미리보기 */}
        {files.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {files.map((file, i) => (
              <div key={i} style={{ position: "relative", cursor: "pointer" }}>
                <img
                  src={URL.createObjectURL(file)}
                  alt={`preview-${i}`}
                  style={{
                    width: "100px",
                    height: "100px",
                    objectFit: "cover",
                    borderRadius: "8px",
                  }}
                  onClick={() =>
                    navigate("/editMosaic", {
                      state: {
                        file,
                        index: i,
                      },
                    })
                  }
                />
                <button
                  onClick={() => {
                    const updated = files.filter((_, idx) => idx !== i);
                    setFiles(updated);
                  }}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    cursor: "pointer",
                    width: 20,
                    height: 20,
                    fontSize: 12,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 글쓰기 에디터 */}
        <RichTextEditor
          editorRef={bodyRef}
          onChange={(val) => {
            bodyRef.current = val;
          }}
        />

        {/* 업로드 버튼 */}
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <label htmlFor="fileUpload" style={{ cursor: "pointer" }}>
            <Icon name="Image" size={28} />
          </label>
          <input
            id="fileUpload"
            type="file"
            accept="image/*, video/*"
            multiple
            onChange={onFileChange}
            style={{ display: "none" }}
          />
          <span style={{ color: theme.colors.textLight }}>
            Add to your post
          </span>
        </div>

        {/* 포스트 제출 */}
        <Button title="Post" onPress={onSubmit} loading={loading} />
      </div>
    </ScreenWrapper>
  );
};

export default NewPost;