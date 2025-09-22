import React, { useEffect, useRef, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ScreenWrapper from "../components/ScreenWrapper";
import Header from "../components/Header";
import Button from "../components/Button";
import { theme } from "../constants/theme";
import { useFiles } from "../contexts/FilesContext";
import MosaicStrengthSlider, {
  strengthToBlockSize,
} from "../components/MosaicStrengthSlider";

const EditMosaic = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { file, index } = state || {};
  const { files, setFiles } = useFiles();

  useEffect(() => {
    if (!file) navigate(-1);
  }, [file, navigate]);

  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // --- blob URL 안전 관리 ---
  const imgRef = useRef(null);
  const blobUrlRef = useRef(null);
  const [imageUrl, setImageUrl] = useState("");

  const revokePrevBlobUrl = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  const setPreviewFromFile = (f) => {
    revokePrevBlobUrl();
    if (f instanceof Blob) {
      const u = URL.createObjectURL(f);
      blobUrlRef.current = u;
      setImageUrl(u);
    } else if (typeof f === "string") {
      setImageUrl(f.startsWith("http") ? f : baseUrl + f);
    } else {
      setImageUrl("");
    }
  };

  const toFileLike = async (f) => {
    if (f instanceof Blob) return f;
    if (typeof f === "string") {
      const url = f.startsWith("http") ? f : baseUrl + f;
      const res = await fetch(url);
      const blob = await res.blob();
      return new File([blob], `image.${blob.type.split("/")[1] || "jpg"}`, {
        type: blob.type,
      });
    }
    return null;
  };

  // ---------- 상태 ----------
  const [analysis, setAnalysis] = useState({});
  const [selectedType, setSelectedType] = useState("faces");
  const [loading, setLoading] = useState(false);
  const [selectedBoxes, setSelectedBoxes] = useState([]);

  // ▼ 추가: 강도/블록크기
  const [strength, setStrength] = useState(40);
  const blockSize = useMemo(
    () => strengthToBlockSize(strength, { min: 4, max: 60 }),
    [strength]
  );

  useEffect(() => {
    setPreviewFromFile(file);
    return () => revokePrevBlobUrl();
  }, [file]);

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
    const xs = polygon.map((p) => p.x);
    const ys = polygon.map((p) => p.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    const w = Math.max(...xs) - x;
    const h = Math.max(...ys) - y;
    return [x, y, w, h];
  };

  // --------- 분석 호출 ----------
  useEffect(() => {
    const analyze = async () => {
      try {
        const realFile = await toFileLike(file);
        if (!realFile) throw new Error("유효한 파일이 없습니다.");

        const type = realFile.type?.startsWith("video") ? "video" : "image";
        const formData = new FormData();
        formData.append(type, realFile);
        const endpoint =
          type === "video"
            ? "/api/protect-video-analyze"
            : "/api/protect-analyze";

        const res = await fetch(endpoint, { method: "POST", body: formData });
        const data = await res.json();

        const wrapBoxes = (arr) =>
          (arr || []).filter(Boolean).map((b) => {
            if (Array.isArray(b) && b.length === 4 && typeof b[0] === "number")
              return { box: b };
            if (
              Array.isArray(b) &&
              b.length === 4 &&
              typeof b[0] === "object" &&
              "x" in b[0]
            )
              return { box: convertPolygonToBox(b) };
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
                faces: (data.results?.[0]?.faces || []).map((f) => ({
                  box: f.box,
                })),
                phones: wrapBoxes(data.results?.[0]?.phones),
                addresses: wrapBoxes(data.results?.[0]?.addresses),
                location_sensitive: wrapBoxes(
                  data.results?.[0]?.location_sensitive
                ),
              };

        setAnalysis(parsed);
      } catch (err) {
        console.error("❌ 분석 실패", err);
        setAnalysis({});
        alert("이미지 분석에 실패했습니다.");
      }
    };
    if (file) analyze();
  }, [file]);

  const toggleSelection = (box) => {
    const key = JSON.stringify(box);
    setSelectedBoxes((prev) =>
      prev.some((b) => JSON.stringify(b) === key)
        ? prev.filter((b) => JSON.stringify(b) !== key)
        : [...prev, box]
    );
  };

  const handleMosaicApply = async () => {
    try {
      const realFile = await toFileLike(file);
      if (!realFile) {
        alert("파일이 없습니다.");
        return;
      }

      const type = realFile.type?.startsWith("video") ? "video" : "image";
      const endpoint =
        type === "video" ? "/api/protect-video-mosaic" : "/api/protect-mosaic";

      const formData = new FormData();
      formData.append(type, realFile);

      const valid = selectedBoxes
        .map((it) => (it && it.box ? it.box : it))
        .filter(
          (box) =>
            Array.isArray(box) && box.length === 4 && box.every(Number.isFinite)
        )
        .map(([x, y, w, h]) => [
          Math.round(x),
          Math.round(y),
          Math.round(x + w),
          Math.round(y + h),
        ]);

      if (valid.length === 0) {
        alert("선택된 박스가 없습니다.");
        return;
      }

      formData.append("selected", JSON.stringify(valid));
      formData.append("block_size", String(blockSize)); // ★ 슬라이더 값 반영

      setLoading(true);
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const text = await res.text();
      const lastLine = text.trim().split("\n").pop();
      const data = JSON.parse(lastLine);

      if (data.error) {
        alert("모자이크 처리 실패: " + data.error);
        return;
      }

      const fileUrl = data.url || (data.urls && data.urls[0]);
      if (!fileUrl) {
        alert("⚠️ 모자이크된 이미지 URL이 없습니다.");
        return;
      }

      const fullUrl = fileUrl.startsWith("http") ? fileUrl : baseUrl + fileUrl;

      setPreviewFromFile(fullUrl);

      const updated = [...files];
      updated[index] = fullUrl;
      setFiles(updated);

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
          paddingBottom: 160, // 하단 고정 바 높이 보정
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        {imageUrl && (
          <div
            style={{ position: "relative", alignSelf: "center", width: "100%" }}
          >
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

              const imgEl = imgRef.current;
              if (!imgEl) return null;

              const scaleX =
                (imgEl.clientWidth || 1) / (imgEl.naturalWidth || 1);
              const scaleY =
                (imgEl.clientHeight || 1) / (imgEl.naturalHeight || 1);

              const [x, y, w, h] = clampBox(
                box,
                imgEl.naturalWidth || 1,
                imgEl.naturalHeight || 1
              );
              const isSelected = selectedBoxes.some(
                (b) => JSON.stringify(b) === JSON.stringify(box)
              );

              return (
                <div
                  key={`${selectedType}-${i}`}
                  onClick={() => toggleSelection(box)}
                  style={{
                    position: "absolute",
                    left: x * scaleX,
                    top: y * scaleY,
                    width: Math.max(w * scaleX, 8),
                    height: Math.max(h * scaleY, 8),
                    border: "2px dashed red",
                    backgroundColor: isSelected
                      ? "rgba(0,0,0,0.5)"
                      : "rgba(0,0,0,0.3)",
                    borderRadius: 4,
                    cursor: "pointer",
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
        )}

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
            (type) => {
              const active = selectedType === type;
              const baseShadow = active
                ? "0 6px 14px rgba(0,0,0,0.12)" // 활성 버튼은 살짝 더 높게
                : "0 2px 6px rgba(0,0,0,0.08)"; // 비활성 기본 그림자

              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  onMouseEnter={(e) => {
                    if (active) {
                      e.currentTarget.style.boxShadow =
                        "0 8px 18px rgba(0,0,0,0.16)";
                    } else {
                      e.currentTarget.style.boxShadow =
                        "0 4px 10px rgba(0,0,0,0.12)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = baseShadow;
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = "translateY(1px)"; // 눌림 느낌
                    e.currentTarget.style.boxShadow =
                      "0 1px 3px rgba(0,0,0,0.10)";
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = baseShadow;
                  }}
                  style={{
                    padding: "10px 12px",
                    flex: 1,
                    backgroundColor: active ? "#F0FDF4" : "#fff",
                    color: active ? "#14532d" : "#111827",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    margin: "0 4px",
                    cursor: "pointer",
                    fontWeight: 600,
                    // ⬇️ 핵심: 그림자 + 트랜지션
                    boxShadow: baseShadow,
                    transition: "box-shadow .12s ease, transform .06s ease",
                  }}
                >
                  {type === "faces" && "얼굴"}
                  {type === "phones" && "전화번호"}
                  {type === "addresses" && "주소"}
                  {type === "location_sensitive" && "위치"}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* ------- 하단 고정: 슬라이더 + 적용 버튼 ------- */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "#fff",
          borderTop: "1px solid #eee",
          boxShadow: "0 -8px 24px rgba(0,0,0,0.05)",
          padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
          zIndex: 50,
        }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <MosaicStrengthSlider
            value={strength}
            onChange={setStrength}
            onCommit={setStrength}
            label="모자이크 강도"
            trackColor="#f7d0d6"
          />

          {/* 버튼 중앙 정렬 */}
          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Button
              title="모자이크 적용"
              onPress={handleMosaicApply}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </ScreenWrapper>
  );
};

export default EditMosaic;
