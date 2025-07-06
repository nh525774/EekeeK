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
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);

    const fileType = selected.type;
    const isImage = fileType.startsWith("image");
    const isVideo = fileType.startsWith("video");

    const formData = new FormData();
    formData.append(isImage ? "image" : "video", selected);

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
      content: bodyRef.current || "", // 이미지 URL로 대체됨
      file: mosaicUrl || file,
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
  const handleMosaicApply = async () => {

    if (!file || selectedTypes.length === 0) {
      alert("모자이크할 항목을 선택해주세요.");
      return;
    }

  const selectedDict = {};
  selectedTypes.forEach((type) => {
    selectedDict[type] = true;
  });

 const fileType = getFileType(file); // "image" 또는 "video"
const endpoint = fileType === "video"
  ? "/api/protect-video-mosaic"
  : "/api/protect-mosaic";

  console.log("🔥 endpoint:", endpoint);

const formData = new FormData();
formData.append(fileType, file); // "image" 또는 "video" 키에 파일 첨부
formData.append("selected", JSON.stringify(selectedDict));

const res = await fetch(endpoint, {
  method: "POST",
  body: formData,
});

  const text = await res.text();
  console.log("🧪 raw response text:", text);
  const lines = text.trim().split('\n');
  const lastLine = lines[lines.length - 1];
  
  let data;
try {
  data = JSON.parse(lastLine);
} catch (err) {
  console.error("❌ JSON parse error:", lastLine);
  alert("서버 응답이 잘못되었습니다.");
  return;
}

  const mosaicPath = data.url;
  console.log("✅ mosaicPath:", mosaicPath);
  if (!mosaicPath) {
  alert("모자이크 결과가 없습니다.");
  return;
}

  // 새 이미지 fetch → File 객체로 변환해서 setFile 교체
  const baseUrl = "http://localhost:5000";
  const response = await fetch(baseUrl + mosaicPath);
  const blob = await response.blob();
  const mosaicFile = new File([blob], "mosaic_" + file.name, { type: blob.type, });


    setFile(mosaicFile); //  최종 post용 이미지 대체
    setAnalysis(null); //  체크박스 제거
    setSelectedTypes([]); //  선택 초기화
    setMosaicUrl(mosaicPath); //  미리보기용 저장
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
            {getFileType(file) === "image" ? (
              <img
                src={
                  mosaicUrl
                    ? `http://localhost:5000${mosaicUrl}`
                    : getFileUrl(file)
                }
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
            ) : (
              <video
                src={getFileUrl(file)}
                controls
                style={{ width: "100%", borderRadius: "12px" }}
              />
            )}
            <button
              onClick={() => {
                setFile(null);
                setAnalysis(null);
                setSelectedTypes([]);
                setMosaicUrl(null);
              }}
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
        {/* 모자이크 체크박스 렌더링 */}

        

{analysis && (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <p style={{ fontWeight: "bold" }}>모자이크할 항목 선택</p>
    {Object.entries(analysis).map(([key, items]) =>
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
    <div style= {{width: 160, alignSelf: "center", marginTop: 12 }}>
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
