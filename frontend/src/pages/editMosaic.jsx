import React, { useEffect, useRef, useState } from "react";
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
  const [selectedType, setSelectedType] = useState("faces");
  const [loading, setLoading] = useState(false);
  const [selectedBoxes, setSelectedBoxes] = useState([]);
  const imgRef = useRef(null);

  const isValidBox = (box) =>
    Array.isArray(box) &&
    box.length === 4 &&
    box.every((n) => typeof n === "number");

  const clampBox = (box, imgW, imgH) => {
    if (!isValidBox(box)) return [0, 0, 0, 0];
    let [x, y, w, h] = box;
    x = Math.max(0, x);
    y = Math.max(0, y);
    w = Math.max(1, Math.min(w, imgW - x));
    h = Math.max(1, Math.min(h, imgH - y));
    return [x, y, w, h];
  };
  const convertPolygonToBox = (polygon) => {
  if (!Array.isArray(polygon) || polygon.length < 4) return [0, 0, 0, 0];
  const xs = polygon.map(p => p.x);
  const ys = polygon.map(p => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x;
  const h = Math.max(...ys) - y;
  return [x, y, w, h];
};

  useEffect(() => {
    const analyze = async () => {
      const type = file.type.startsWith("video") ? "video" : "image";
      const formData = new FormData();
      formData.append(type, file);

      const endpoint =
        type === "video" ? "/api/protect-video-analyze" : "/api/protect-analyze";

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        const wrapBoxes = (arr) =>
          (arr || []).filter(Boolean).map((b) => {
            if (Array.isArray(b) && b.length === 4 && typeof b[0] === "number") {
              return { box: b };
            }
            if (Array.isArray(b) && b.length === 4 && typeof b[0] === "object" && "x" in b[0]) {
              return { box: convertPolygonToBox(b) }; // 꼭짓점 배열 처리
            }
            return { box: [0, 0, 0, 0] };
  });

        const parsed =
          type === "video"
            ? {
                faces: wrapBoxes(data.faces),
                phones: wrapBoxes(data.phones),
                addresses: wrapBoxes(data.addresses),
                location_sensitive: wrapBoxes(data.location_sensitive),
              }
            : {
                faces: (data.results?.[0]?.faces || []).map(f => ({ box: f.box })),
                phones: wrapBoxes(data.results?.[0]?.phones),
                addresses: wrapBoxes(data.results?.[0]?.addresses),
                location_sensitive: wrapBoxes(data.results?.[0]?.location_sensitive),
              };

        console.group("📦 분석된 박스 목록");
        Object.entries(parsed).forEach(([key, arr]) => {
          console.log(`🟡 ${key}: ${arr.length}개`);
          arr.forEach((item, i) => {
            console.log(`  #${i + 1}:`, item.box);
          });
        });
        console.groupEnd();

        setAnalysis(parsed);
      } catch (err) {
        console.error("❌ 분석 실패", err);
        alert("이미지 분석에 실패했습니다.");
      }
    };

    if (file) analyze();
  }, [file]);

  const toggleSelection = (box) => {
    const boxKey = JSON.stringify(box);
    setSelectedBoxes((prev) => {
      const exists = prev.some((b) => JSON.stringify(b) === boxKey);
      return exists
        ? prev.filter((b) => JSON.stringify(b) !== boxKey)
        : [...prev, box];
    });
  };

  const handleMosaicApply = async () => {
  const type = file.type.startsWith("video") ? "video" : "image";
  const endpoint = type === "video" ? "/api/protect-video-mosaic" : "/api/protect-mosaic";

  const formData = new FormData();
  formData.append(type, file);

  const selected = [selectedType]; // 지금 선택된 항목 1개만 적용
  formData.append("selected", JSON.stringify(selected));

  try {
    setLoading(true);
    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const text = await res.text();
    const lastLine = text.trim().split("\n").pop();
    const data = JSON.parse(lastLine);
    const fileUrl = data.url || (data.urls && data.urls[0]);
    if (!fileUrl) throw new Error("응답에 url이 없습니다");

    const blob = await (await fetch("http://localhost:5000" + fileUrl)).blob();
    const mosaicFile = new File([blob], "mosaic_" + file.name, { type: blob.type });

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
      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: 20 }}>
        <div style={{ position: "relative", alignSelf: "center", maxWidth: 400 }}>
          <img
            ref={imgRef}
            src={imageUrl}
            alt="preview"
            style={{
              width: "100%",
              display: "block",
              borderRadius: 12,
              border: "1px solid #ccc",
            }}
          />

          {(analysis[selectedType] || []).map((item, i) => {
            const box = item.box;
            if (!isValidBox(box)) return null;

            const imgElement = imgRef.current;
            if (!imgElement) return null;

            const naturalWidth = imgElement.naturalWidth || 1;
            const naturalHeight = imgElement.naturalHeight || 1;
            const displayWidth = imgElement.clientWidth || 1;
            const displayHeight = imgElement.clientHeight || 1;

            const scaleX = displayWidth / naturalWidth;
            const scaleY = displayHeight / naturalHeight;

            const [x, y, w, h] = clampBox(box, naturalWidth, naturalHeight);
            const scaledX = x * scaleX;
            const scaledY = y * scaleY;
            const scaledW = Math.max(w * scaleX, 8);
            const scaledH = Math.max(h * scaleY, 8);

            return (
              <div
                key={`${selectedType}-${i}`}
                onClick={() => toggleSelection(item.box)}
                style={{
                  position: "absolute",
                  top: scaledY,
                  left: scaledX,
                  width: scaledW,
                  height: scaledH,
                  border: "2px dashed red",
                  backgroundColor: "rgba(0,0,0,0.3)",
                  cursor: "pointer",
                  pointerEvents: "auto",
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

        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            marginTop: 12,
            borderTop: `1px solid ${theme.colors.border}`,
            paddingTop: 8,
          }}
        >
          {["faces", "phones", "addresses", "location_sensitive"].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              style={{
                padding: "8px 12px",
                flex: 1,
                backgroundColor: selectedType === type ? theme.colors.primary : "#f0f0f0",
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
          ))}
        </div>

        <div style={{ alignSelf: "center", marginTop: 20 }}>
          <Button title="모자이크 적용" onPress={handleMosaicApply} loading={loading} />
        </div>
      </div>
    </ScreenWrapper>
  );
};

export default EditMosaic;
