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
  const [files, setFiles] = useState([]); //File[]
  const [title] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [mosaicUrl, setMosaicUrl] = useState(null);

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
  //임시
  /*const user = {
    photoURL: "/default-profile.png",
    displayName: "게스트",
    uid: "test-user", 
}; */

  const onFileChange = async (e) => {
    const selected = Array.from(e.target.files || []).slice(0, 4); // ✅ 최대 4장만

    if (selected.length === 0) return;

    setFiles(selected); // ✅ 여러 개 저장

    const first = selected[0]; // 분석은 첫 번째 이미지 기준
    const fileType = first.type;
    const isImage = fileType.startsWith("image");
    const isVideo = fileType.startsWith("video");

    const formData = new FormData();
    formData.append(isImage ? "image" : "video", first);

    if (isVideo) {
      try {
        const res = await fetch("/api/protect-video-analyze", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        setAnalysis({
          faces: Array(data.faces || 0).fill({}),
          phones: Array(data.phones || 0).fill({}),
          license_plates: Array(data.license_plates || 0).fill({}),
          addresses: Array(data.addresses || 0).fill({}),
          location_sensitive: Array(data.location_sensitive || 0).fill({}),
        });
      } catch (err) {
        console.error("❌ 비디오 분석 실패:", err);
        alert("비디오 분석에 실패했습니다.");
      }
      return;
    }

    // 이미지 분석
    try {
      const res = await fetch("/api/protect-analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      console.error("❌ 이미지 분석 실패:", err);
      alert("이미지 분석에 실패했습니다.");
    }
  };

  const getFileType = (file) => {
    if (!file || typeof file.type !== "string") return null;
    console.log("📦 file.type:", file.type);
    return file.type.startsWith("image") ? "image" : "video";
  };

  const onSubmit = async () => {
    if (!bodyRef.current && !files) {
      alert("Please add content or attach a file.");
      return;
    }

    const post = {
      title: title || "무제",
      content: bodyRef.current || "", // 이미지 URL로 대체됨
      files: files,
    };

    // create post
    setLoading(true);
    let res = await createOrUpdatePost(post);
    setLoading(false);

    if (res.success) {
      setFiles(null);
      bodyRef.current = "";
      navigate(-1);
    } else {
      alert("Post failed:" + res.msg);
    }
  };
  const handleMosaicApply = async () => {
    if (files.length === 0 || selectedTypes.length === 0) {
      alert("모자이크할 항목을 선택해주세요.");
      return;
    }

    const selectedDict = {};
    selectedTypes.forEach((type) => {
      selectedDict[type] = true;
    });

    const newFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileType = getFileType(file);
      const endpoint =
        fileType === "video"
          ? "/api/protect-video-mosaic"
          : "/api/protect-mosaic";

      const formData = new FormData();
      formData.append(fileType, file);
      formData.append("selected", JSON.stringify(selectedDict));

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });

        const text = await res.text();
        const lines = text.trim().split("\n");
        const lastLine = lines[lines.length - 1];
        const data = JSON.parse(lastLine);

        if (!data.url) {
          alert(`파일 ${i + 1} 모자이크 실패`);
          newFiles.push(file); // 원본 유지
          continue;
        }

        const baseUrl = "http://localhost:5000";
        const response = await fetch(baseUrl + data.url);
        const blob = await response.blob();
        const mosaicFile = new File([blob], "mosaic_" + file.name, {
          type: blob.type,
        });

        newFiles.push(mosaicFile); // ✅ 교체된 모자이크 파일 저장
      } catch (err) {
        console.error(`❌ 파일 ${i + 1} 모자이크 처리 실패:`, err);
        newFiles.push(file); // 실패하면 원본 유지
      }
    }

    setFiles(newFiles); // ✅ files 배열 전부 교체
    setAnalysis(null);
    setSelectedTypes([]);
    setMosaicUrl(null); // ✅ 더 이상 필요 없음
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
        {files.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {files.map((file, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img
                  src={
                    i === 0 && mosaicUrl
                      ? `http://localhost:5000${mosaicUrl}` // ✅ 첫 번째 파일만 모자이크 결과 보여줌
                      : URL.createObjectURL(file)
                  }
                  alt={`preview-${i}`}
                  style={{
                    width: "100px",
                    height: "100px",
                    objectFit: "cover",
                    borderRadius: "8px",
                  }}
                />
                <button
                  onClick={() => {
                    const updated = files.filter((_, idx) => idx !== i);
                    setFiles(updated);
                    setAnalysis(null); // 분석 결과 초기화
                    setSelectedTypes([]);
                    setMosaicUrl(null);
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
            multiple
            onChange={onFileChange}
            style={{ display: "none" }}
          />
          <span style={{ color: theme.colors.textLight }}>
            Add to your post
          </span>
        </div>
        {/* 모자이크 체크박스 렌더링 */}

        {analysis && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <p style={{ fontWeight: "bold" }}>모자이크할 항목 선택</p>
            {Object.entries(analysis).map(
              ([key, items]) =>
                items.length > 0 && (
                  <label key={key}>
                    <input
                      type="checkbox"
                      value={key}
                      checked={selectedTypes.includes(key)}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedTypes((prev) =>
                          e.target.checked
                            ? [...prev, value]
                            : prev.filter((v) => v !== value)
                        );
                      }}
                    />
                    {key} ({items.length})
                  </label>
                )
            )}
            <div style={{ width: 160, alignSelf: "center", marginTop: 12 }}>
              <Button
                title="모자이크 적용"
                onPress={handleMosaicApply}
                buttonStyle={{
                  width: 160,
                  paddingTop: 6,
                  paddingBottom: 6,
                  paddingLeft: 16,
                  paddingRight: 16,
                }}
              />
            </div>
          </div>
        )}

        {/* 제출 */}
        <Button title="Post" onPress={onSubmit} loading={loading} />
      </div>
    </ScreenWrapper>
  );
};

export default NewPost;
