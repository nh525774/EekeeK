// src/pages/DeepfakeFilter.jsx
import React, { useState } from "react";
import ScreenWrapper from "../components/ScreenWrapper";
import Header from "../components/Header";
import Button from "../components/Button";
import Icon from "../assets/icons"; // ✅ assets의 Image 아이콘
import { theme } from "../constants/theme";
import { uploadAndFilterImage } from "../api/deepfake";

const DeepfakeFilter = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [hovered, setHovered] = useState(false); // 업로드 박스 hover
  const [resultUrl, setResultUrl] = useState(null);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0] ?? null);
  };

  const handleAnalyzeClick = async () => {
    if (!selectedFile) {
      alert("먼저 이미지를 업로드해주세요!");
      return;
    }
    try {
      setAnalyzing(true);
      const { imageUrl } = await uploadAndFilterImage(selectedFile);
      setResultUrl(imageUrl);
    } catch (err) {
      console.error(err);
      alert("필터 적용 중 오류가 발생했습니다.");
    } finally {
      setAnalyzing(false);
    }
  };

  // ───────── 저장(다운로드) 기능 ─────────
  const filenameFrom = (url) => {
    try {
      const name = url.split("?")[0].split("/").pop();
      return name || "filtered_image.jpg";
    } catch {
      return "filtered_image.jpg";
    }
  };

  // 교차 출처 URL이어도 fetch→blob으로 강제 다운로드 가능
  const downloadResult = async () => {
    if (!resultUrl) return;
    try {
      const res = await fetch(resultUrl, { mode: "cors" });
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filenameFrom(resultUrl);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      // 일부 브라우저/스토리지 CORS가 막힐 수 있으니 새 탭 열기 fallback
      window.open(resultUrl, "_blank", "noopener");
    }
  };

  // ---------- 인라인 스타일 ----------
  const pageWrap = {
    padding: 24,
    textAlign: "center",
    marginTop: 8, // 헤더와 본문 사이 간격
    fontFamily: theme?.fonts?.base || "Pretendard, Noto Sans KR, sans-serif",
  };

  const leadText = {
    color: "#4B5563",
    marginBottom: 12,
    marginTop: 5,
    fontWeight: theme?.fonts?.medium || 500,
  };

  const subNotice = {
    color: "#6B7280",
    marginBottom: 20,
    fontWeight: theme?.fonts?.semibold || 600,
    fontSize: 12,
  };

  const outerCard = {
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 20,
    padding: 16,
    maxWidth: 520,
    margin: "0 auto",
    background: "rgba(255, 255, 255, 0.65)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
    textAlign: "left",
  };

  const dashedBox = {
    display: "block",
    border: "2px dashed #D1D5DB",
    borderRadius: 20,
    padding: "40px 24px",
    textAlign: "center",
    cursor: "pointer",
    userSelect: "none",
    transition: "background 0.25s ease, transform 0.25s ease",
    background: hovered ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)",
    transform: hovered ? "translateY(-1px)" : "translateY(0)",
  };

  const sectionTitle = { fontWeight: 600, color: "#1F2937" };
  const sectionSub = { fontSize: 13, color: "#6B7280", marginTop: 2 };
  const helper = { fontSize: 14, color: "#4B5563", marginTop: 8 };
  const helperMuted = { fontSize: 12, color: "#9CA3AF" };

  const pendingBox = {
    marginTop: 32,
    border: "1px solid #E5E7EB",
    borderRadius: 16,
    padding: 16,
    background: "#F9FAFB",
  };

  const previewImg = {
    display: "block",
    margin: "0 auto 8px",
    maxHeight: 160,
    objectFit: "contain",
    borderRadius: 12,
  };
  // 결과 카드 (버튼 아래로 이동)
  const resultCard = {
    marginTop: 18,
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 16,
    padding: 14,
    background: "white",
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
    textAlign: "center",
  };

   return (
    <ScreenWrapper bg="white">
      <Header title="Deepfake Prevention Filter" showBack />

      <div style={pageWrap}>
        <p style={leadText}>얼굴이 나온 이미지를 업로드하면 딥페이크 방지 필터를 적용합니다.</p>
        <p style={subNotice}>한 명만 나온 사진을 사용해주세요</p>

        {/* 업로드 박스 */}
        <div style={outerCard}>
          <div style={{ marginBottom: 8 }}>
            <p style={sectionTitle}>📤 원본 이미지</p>
            <p style={sectionSub}>필터를 적용할 이미지를 선택하세요</p>
          </div>

          <label
            htmlFor="fileInput"
            style={dashedBox}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {selectedFile ? (
              <div style={{ color: "#374151" }}>
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="미리보기"
                  style={previewImg}
                />
                <p style={{ fontSize: 13 }}>{selectedFile.name}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <Icon name="Image" size={40} color="#9CA3AF" />
                <p style={helper}>클릭하여 이미지를 업로드하세요</p>
                <p style={helperMuted}>JPG, PNG 지원</p>
              </div>
            )}

            <input
              id="fileInput"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </label>
        </div>

        {/* 버튼만 남기고 결과는 아래 카드에 따로 렌더 */}
        <div style={pendingBox}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Button
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="Image" size={18} color="white" />
                  <span>EekshielD 필터 적용</span>
                </div>
              }
              onPress={handleAnalyzeClick}
              loading={analyzing}
              style={{
                backgroundColor: theme.colors.primary,
                color: "#fff",
                borderRadius: 10,
                padding: "8px 16px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
              disabled={!selectedFile || analyzing}
            />
          </div>

          {/* ✅ 결과는 버튼 아래 카드로 */}
          {resultUrl && (
            <div style={resultCard}>
              <img
                src={resultUrl}
                alt="필터 적용 결과"
                style={{
                  maxWidth: 520,
                  width: "100%",
                  borderRadius: 12,
                  display: "block",
                  margin: "0 auto",
                }}
              />
              <p style={{ fontSize: 13, color: "#6B7280", marginTop: 8 }}>
                필터 적용 결과
              </p>

              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 10 }}>
                <Button
                  title="이미지 저장"
                  onPress={downloadResult}
                  style={{
                    backgroundColor: theme.colors.primary,
                    color: "#fff",
                    borderRadius: 10,
                    padding: "8px 14px",
                  }}
                />
              </div>

              <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>
                모바일은 이미지 길게 눌러 저장할 수도 있어요.
              </p>
            </div>
          )}
        </div>
      </div>
    </ScreenWrapper>
  );
};

export default DeepfakeFilter;
