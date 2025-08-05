import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ScreenWrapper from "../components/ScreenWrapper";
import Header from "../components/Header";
import Button from "../components/Button";
import { theme } from "../constants/theme";
import { useFiles } from "../contexts/FilesContext";

const EditMosaic = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { file, index } = state || {};
  const { files, setFiles } = useFiles();

  const [imageUrl] = useState(URL.createObjectURL(file));
  const [analysis, setAnalysis] = useState({});
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const analyze = async () => {
      const type = file.type.startsWith("video") ? "video" : "image";
      const formData = new FormData();
      formData.append(type, file);

      const endpoint =
        type === "video"
          ? "/api/protect-video-analyze"
          : "/api/protect-analyze";

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        const parsed =
          type === "video"
            ? {
                faces: Array(data.faces || 0).fill({ box: [20, 30, 100, 100] }),
                phones: Array(data.phones || 0).fill({
                  box: [40, 150, 160, 30],
                }),
                addresses: Array(data.addresses || 0).fill({
                  box: [20, 200, 180, 40],
                }),
                location_sensitive: Array(data.location_sensitive || 0).fill({
                  box: [30, 260, 170, 40],
                }),
              }
            : data.results[0] || {};

        setAnalysis(parsed);
      } catch (err) {
        console.error("❌ 분석 실패", err);
        alert("이미지 분석에 실패했습니다.");
      }
    };

    if (file) analyze();
  }, [file]);

  const handleMosaicApply = async () => {
    if (!file || !selectedType) {
      alert("모자이크할 항목을 선택해주세요.");
      return;
    }

    const selectedDict = { [selectedType]: true };
    const type = file.type.startsWith("video") ? "video" : "image";
    const endpoint =
      type === "video" ? "/api/protect-video-mosaic" : "/api/protect-mosaic";

    const formData = new FormData();
    formData.append(type, file);
    formData.append("selected", JSON.stringify(selectedDict));

    try {
      setLoading(true);
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });
      const text = await res.text();
      console.log("📤 Raw mosaic response:", text);
      const lastLine = text.trim().split("\n").pop();
      const data = JSON.parse(lastLine);
      const fileUrl = data.url || (data.urls && data.urls[0]); // 배열 대응 추가
      if (!fileUrl) throw new Error("응답에 url이 없습니다");

      const blob = await (
        await fetch("http://localhost:5000" + fileUrl)
      ).blob();
      const mosaicFile = new File([blob], "mosaic_" + file.name, {
        type: blob.type,
      });

      const updatedFiles = [...files];
      updatedFiles[index] = mosaicFile;
      setFiles(updatedFiles);

      navigate(-1);
    } catch (err) {
      console.error("❌ 모자이크 처리 실패", err);
      alert("모자이크 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper bg="white">
      <Header title="모자이크" showBack />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          padding: 20,
        }}
      >
        {/* 이미지 + 박스 */}
        <div
          style={{ position: "relative", alignSelf: "center", maxWidth: 400 }}
        >
          <img
            src={imageUrl}
            alt="preview"
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid #ccc",
            }}
          />

          {/* 선택된 항목 박스 + 번호 */}
          {selectedType &&
            (analysis[selectedType] || []).map((item, i) => {
              const [x, y, w, h] = item.box || [0, 0, 100, 40];
              return (
                <div
                  key={`${selectedType}-${i}`}
                  style={{
                    position: "absolute",
                    top: y,
                    left: x,
                    width: w,
                    height: h,
                    border: "2px dashed red",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    pointerEvents: "none",
                    borderRadius: 4,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: -18,
                      left: -6,
                      backgroundColor: "red",
                      color: "white",
                      fontSize: 12,
                      padding: "2px 6px",
                      borderRadius: 12,
                      fontWeight: "bold",
                    }}
                  >
                    {i + 1}
                  </span>
                </div>
              );
            })}
        </div>

        {/* 탭 버튼 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            marginTop: 12,
            borderTop: `1px solid ${theme.colors.border}`,
            paddingTop: 8,
          }}
        >
          {["faces", "phones", "addresses", "location_sensitive"].map(
            (type) => (
              <button
                key={type}
                onClick={() =>
                  setSelectedType((prev) => (prev === type ? null : type))
                }
                style={{
                  padding: "8px 12px",
                  flex: 1,
                  backgroundColor:
                    selectedType === type ? theme.colors.primary : "#f0f0f0",
                  color: selectedType === type ? "white" : theme.colors.text,
                  fontWeight: selectedType === type ? "bold" : "normal",
                  border: "none",
                  borderRadius: 6,
                  margin: "0 4px",
                  cursor: "pointer",
                }}
              >
                {type === "faces" && "얼굴"}
                {type === "phones" && "전화번호"}
                {type === "addresses" && "주소"}
                {type === "location_sensitive" && "위치"}
              </button>
            )
          )}
        </div>

        {/* 모자이크 적용 버튼 */}
        <div style={{ alignSelf: "center", marginTop: 20 }}>
          <Button
            title="모자이크 적용"
            onPress={handleMosaicApply}
            loading={loading}
          />
        </div>
      </div>
    </ScreenWrapper>
  );
};

export default EditMosaic;
