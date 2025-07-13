// ✅ Step-by-step 개선된 NewPost 코드 (탭 + 박스 UI 적용)

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
  const [files, setFiles] = useState([]);
  const [title] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [selectedBoxes, setSelectedBoxes] = useState({});
  const [mode, setMode] = useState("upload");

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
    const newFiles = [...files, ...selected.slice(0, 1)];
    setFiles(newFiles);
    setMode("edit"); // 🔄 이미지 클릭 → 편집모드 전환

    const first = selected[0];
    const fileType = first.type;
    const isImage = fileType.startsWith("image");

    const formData = new FormData();
    formData.append(isImage ? "image" : "video", first);

    const res = await fetch("/api/protect-analyze", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setAnalysis(data);
  };

  const handleMosaicApply = async () => {
    const selectedDict = {};
    Object.keys(selectedBoxes).forEach((type) => {
      if (selectedBoxes[type]?.length > 0) {
        selectedDict[type] = selectedBoxes[type];
      }
    });

    if (files.length === 0 || Object.keys(selectedDict).length === 0) {
      alert("모자이크할 항목을 선택해주세요.");
      return;
    }

    const file = files[0];
    const formData = new FormData();
    formData.append("image", file);
    formData.append("selected", JSON.stringify(selectedDict));

    const res = await fetch("/api/protect-mosaic", {
      method: "POST",
      body: formData,
    });

    const text = await res.text();
    const lastLine = text.trim().split("\n").pop();
    const data = JSON.parse(lastLine);
    const blob = await fetch("http://localhost:5000" + data.url).then((r) =>
      r.blob()
    );
    const mosaicFile = new File([blob], "mosaic_" + file.name, {
      type: blob.type,
    });
    setFiles([mosaicFile]);
    setAnalysis(null);
    setSelectedBoxes({});
    setActiveTab(null);
    setMode("upload");
  };

  const getFileUrl = (file) => (file ? URL.createObjectURL(file) : null);

  const onSubmit = async () => {
    const post = {
      title: title || "무제",
      content: bodyRef.current || "",
      files,
    };
    setLoading(true);
    const res = await createOrUpdatePost(post);
    setLoading(false);
    if (res.success) navigate(-1);
    else alert("Post failed:" + res.msg);
  };

  return (
    <ScreenWrapper bg="white">
      <Header title="Create Post" />
      <div style={{ ...styles.loginContainer, gap: 28, paddingTop: 32 }}>
        {/* 프로필 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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

        {mode === "upload" && (
          <>
            {/* 썸네일 */}
            {files.length > 0 && (
              <div style={{ display: "flex", gap: 8 }}>
                {files.map((file, i) => (
                  <img
                    key={i}
                    src={getFileUrl(file)}
                    alt="preview"
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 8,
                      objectFit: "cover",
                    }}
                    onClick={() => setMode("edit")}
                  />
                ))}
              </div>
            )}

            {/* 파일 업로드 */}
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <label htmlFor="fileUpload" style={{ cursor: "pointer" }}>
                <Icon name="Image" size={28} />
              </label>
              <input
                id="fileUpload"
                type="file"
                accept="image/*"
                onChange={onFileChange}
                style={{ display: "none" }}
              />
              <span style={{ color: theme.colors.textLight }}>사진 업로드</span>
            </div>
          </>
        )}

        {mode === "edit" && files.length > 0 && (
          <div style={{ position: "relative", width: "100%" }}>
            <img
              src={getFileUrl(files[0])}
              alt="edit"
              style={{ width: "100%", maxWidth: 300, borderRadius: 12 }}
            />

            {/* 박스 렌더링 */}
            {analysis &&
              activeTab &&
              analysis[activeTab]?.map((item, idx) => {
                const [x1, y1, x2, y2] = item.box;
                const isSelected = selectedBoxes[activeTab]?.includes(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedBoxes((prev) => {
                        const selected = prev[activeTab] || [];
                        return {
                          ...prev,
                          [activeTab]: selected.includes(idx)
                            ? selected.filter((i) => i !== idx)
                            : [...selected, idx],
                        };
                      });
                    }}
                    style={{
                      position: "absolute",
                      left: x1,
                      top: y1,
                      width: x2 - x1,
                      height: y2 - y1,
                      border: "2px dashed red",
                      backgroundColor: isSelected
                        ? "rgba(0,0,0,0.3)"
                        : "transparent",
                      cursor: "pointer",
                      borderRadius: 4,
                    }}
                  />
                );
              })}

            {/* 탭 버튼 */}
            {analysis && (
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                {Object.entries(analysis).map(([key, items]) =>
                  items.length > 0 ? (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      style={{
                        padding: "8px 16px",
                        backgroundColor:
                          activeTab === key ? theme.colors.primary : "#ccc",
                        color: activeTab === key ? "#fff" : "#000",
                        borderRadius: 8,
                        border: "none",
                        fontWeight: "bold",
                      }}
                    >
                      {key}
                    </button>
                  ) : null
                )}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <Button title="모자이크 적용" onPress={handleMosaicApply} />
            </div>
          </div>
        )}

        <RichTextEditor
          editorRef={bodyRef}
          onChange={(val) => {
            bodyRef.current = val;
          }}
        />

        <Button title="Post" onPress={onSubmit} loading={loading} />
      </div>
    </ScreenWrapper>
  );
};

export default NewPost;
