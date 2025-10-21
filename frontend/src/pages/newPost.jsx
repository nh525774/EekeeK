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
import { useFiles } from "../contexts/FilesContext";
import { getUserImageSrc } from "../services/imageService";

const NewPost = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bodyRef = useRef("");
  const [loading, setLoading] = useState(false);
  const [title] = useState("");
  // 공개 범위 (UI)
  const [visibility, setVisibility] = useState("public");

  const { files, setFiles } = useFiles();
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const toAbs = (u) => (u?.startsWith("http") ? u : baseUrl + u);
  const createdUrlsRef = useRef(new Set());

  // 메모리 정리
  useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      createdUrlsRef.current.clear();
    };
  }, []);

  const user = auth.currentUser;
  const [me, setMe] = useState(null);

  // 내 최신 프로필 가져오기
  useEffect(() => {
    (async () => {
      try {
        if (!auth.currentUser) return;
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setMe(data); // data.username, data.profileImageUrl 존재
      } catch {
        setMe(null);
      }
    })();
  }, []);

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

    setLoading(true);
    try {
      const result = await createOrUpdatePost({
        title: title || "무제",
        content: bodyRef.current || "",
        files, // Blob/File 또는 "/static/..." 문자열 포함
        file: location.state?.file,
        visibility, // "public" | "mutual" | "eekrew" (서비스가 지원하면 활용)
        eeKrewListID: null, //or 선택된 ID
      });

      if (!result.success) {
        alert("Post failed: " + result.msg);
      } else {
        setFiles([]);
        bodyRef.current = "";
        navigate("/Home");
      }
    } catch (e) {
      alert("Post failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // 공통 썸네일 스타일/헬퍼
  const thumbStyle = {
    width: 100,
    height: 100,
    objectFit: "cover",
    borderRadius: 8,
    background: "#eee",
    display: "block",
  };

  const isVideo = (f) => {
    const t = f?.type || "";
    if (t) return t.startsWith("video/");
    if (typeof f === "string") return /\.(mp4|webm|ogg)(\?.*)?$/i.test(f);
    return false;
  };

  const toPreviewSrc = (f) => {
    if (f instanceof Blob) {
      const u = URL.createObjectURL(f);
      createdUrlsRef.current.add(u);
      return u;
    }
    if (typeof f === "string") return toAbs(f);
    return f;
  };

  return (
    <ScreenWrapper bg="white">
      <Header title="Create Post" showBack />
      <div
        style={{ ...styles.loginContainer, gap: "28px", paddingTop: "32px" }}
      >
        {/* 프로필 */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Avatar
            uri={getUserImageSrc(
              me?.profileImageUrl || user?.photoURL || "/defaultUser.png"
            )}
            size={hp(6.5)}
            rounded={theme.radius.xl}
          />
          <div>
            <p style={{ fontWeight: theme.fonts.semibold }}>
              {me?.username || user?.displayName || "User"}
            </p>
            <div style={{ marginTop: 4 }}>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                style={{
                  padding: "6px 10px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  fontSize: hp(1.6),
                  color: theme.colors.text,
                  background: "#fff",
                }}
              >
                <option value="public">Public</option>
                <option value="mutual">Mutual</option>
                <option value="eekrew">EeKrew</option>
              </select>
            </div>
          </div>
        </div>

        {/* 썸네일 미리보기 */}
        {files.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {files.map((file, i) => {
              if (!file) return null;
              const previewSrc = toPreviewSrc(file);
              return (
                <div
                  key={i}
                  style={{ position: "relative", cursor: "pointer" }}
                  onClick={() =>
                    navigate("/editMosaic", { state: { file, index: i } })
                  }
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {isVideo(file) ? (
                    <video
                      key={previewSrc}
                      src={previewSrc}
                      style={{ ...thumbStyle, pointerEvents: "none" }}
                      preload="metadata"
                      playsInline
                      muted
                      crossOrigin="anonymous"
                      onError={() => {}}
                    />
                  ) : (
                    <img
                      key={previewSrc}
                      src={previewSrc}
                      alt={`preview-${i}`}
                      style={thumbStyle}
                    />
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const updated = files.filter((_, idx) => idx !== i);
                      setFiles(updated);
                    }}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      backgroundColor: "rgba(0,0,0,0.55)",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      cursor: "pointer",
                      width: 20,
                      height: 20,
                      fontSize: 12,
                      lineHeight: "20px",
                      textAlign: "center",
                    }}
                    aria-label="remove"
                    title="제거"
                  >
                    ×
                  </button>

                  {isVideo(file) && (
                    <div
                      style={{
                        position: "absolute",
                        left: 6,
                        bottom: 6,
                        background: "rgba(0,0,0,0.55)",
                        color: "white",
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 6,
                        pointerEvents: "none",
                      }}
                    >
                      VIDEO
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 이전 페이지에서 경로만 넘어온 경우 */}
        {files.length === 0 &&
          location.state?.file &&
          (() => {
            const raw = location.state.file;
            const src = toAbs(raw);
            const isVid =
              typeof raw === "string" && /\.(mp4|webm|ogg)(\?.*)?$/i.test(raw);

            return (
              <div
                style={{
                  position: "relative",
                  display: "inline-block",
                  cursor: "pointer",
                }}
                onClick={() =>
                  navigate("/editMosaic", { state: { file: raw, index: 0 } })
                }
                onContextMenu={(e) => e.preventDefault()}
              >
                {isVid ? (
                  <video
                    src={src}
                    style={{ ...thumbStyle, pointerEvents: "none" }}
                    preload="metadata"
                    playsInline
                    muted
                    crossOrigin="anonymous"
                    onError={() => {}}
                  />
                ) : (
                  <img src={src} alt="mosaic-preview" style={thumbStyle} />
                )}
                {isVid && (
                  <div
                    style={{
                      position: "absolute",
                      left: 6,
                      bottom: 6,
                      background: "rgba(0,0,0,0.55)",
                      color: "white",
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 6,
                      pointerEvents: "none",
                    }}
                  >
                    VIDEO
                  </div>
                )}
              </div>
            );
          })()}

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
