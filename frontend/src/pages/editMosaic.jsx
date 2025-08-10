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

  useEffect(() => {
    if (!file) navigate(-1);
  }, [file, navigate]);

  const baseUrl = "http://localhost:5000";

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

  // 파일이 Blob이면 미리보기 blob URL, 문자열이면 그대로 URL 미리보기
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

  // 문자열 URL로 온 파일을 실제 Blob/File 로 바꿔주기
  const toFileLike = async (f) => {
    if (f instanceof Blob) return f;
    if (typeof f === "string") {
      const url = f.startsWith("http") ? f : baseUrl + f;
      const res = await fetch(url);
      const blob = await res.blob();
      // 파일 필드로 보낼 수 있게 File 래핑
      return new File([blob], `image.${blob.type.split("/")[1] || "jpg"}`, { type: blob.type });
    }
    return null;
  };

  // ---------- 상태 ----------
  const [analysis, setAnalysis] = useState({});
  const [selectedType, setSelectedType] = useState("faces");
  const [loading, setLoading] = useState(false);
  const [selectedBoxes, setSelectedBoxes] = useState([]);

  useEffect(() => {
    setPreviewFromFile(file);
    return () => revokePrevBlobUrl();
    // file 변경시에만
  }, [file]);

  const isValidBox = (box) =>
    Array.isArray(box) && box.length === 4 && box.every((n) => typeof n === "number");

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

  // --------- 분석 호출 (파일/URL 모두 대응) ----------
  useEffect(() => {
    const analyze = async () => {
      try {
        const realFile = await toFileLike(file); // <- 핵심
        if (!realFile) throw new Error("유효한 파일이 없습니다.");

        const type = realFile.type?.startsWith("video") ? "video" : "image";
        const formData = new FormData();
        formData.append(type, realFile);
        const endpoint = type === "video" ? "/api/protect-video-analyze" : "/api/protect-analyze";

        const res = await fetch(endpoint, { method: "POST", body: formData });
        const data = await res.json();

        const wrapBoxes = (arr) =>
          (arr || []).filter(Boolean).map((b) => {
            if (Array.isArray(b) && b.length === 4 && typeof b[0] === "number") return { box: b };
            if (Array.isArray(b) && b.length === 4 && typeof b[0] === "object" && "x" in b[0])
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
                faces: (data.results?.[0]?.faces || []).map((f) => ({ box: f.box })),
                phones: wrapBoxes(data.results?.[0]?.phones),
                addresses: wrapBoxes(data.results?.[0]?.addresses),
                location_sensitive: wrapBoxes(data.results?.[0]?.location_sensitive),
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
      const realFile = await toFileLike(file); // <- 문자열 URL도 처리
      if (!realFile) {
        alert("파일이 없습니다.");
        return;
      }

      const type = realFile.type?.startsWith("video") ? "video" : "image";
      const endpoint = type === "video" ? "/api/protect-video-mosaic" : "/api/protect-mosaic";

      const formData = new FormData();
      formData.append(type, realFile);

      const valid = selectedBoxes
        .map((it) => (it && it.box ? it.box : it))
        .filter((box) => Array.isArray(box) && box.length === 4 && box.every(Number.isFinite))
        .map(([x, y, w, h]) => [Math.round(x), Math.round(y), Math.round(x + w), Math.round(y + h)]);

      if (valid.length === 0) {
        alert("선택된 박스가 없습니다.");
        return;
      }
      formData.append("selected", JSON.stringify(valid));

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

      // 미리보기도 새 URL로 적용(경고 억제용)
      setPreviewFromFile(fullUrl);

      const updated = [...files];
      updated[index] = fullUrl; // 상태에는 URL 저장
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
      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: 20 }}>
        {imageUrl && (
          <div style={{ position: "relative", alignSelf: "center", maxWidth: 400 }}>
            <img
              ref={imgRef}
              src={imageUrl}
              alt="preview"
              style={{ width: "100%", display: "block", borderRadius: 12, border: "1px solid #ccc" }}
            />
            {(analysis[selectedType] || []).map((item, i) => {
              const box = item.box;
              if (!isValidBox(box)) return null;

              const imgEl = imgRef.current;
              if (!imgEl) return null;

              const scaleX = (imgEl.clientWidth || 1) / (imgEl.naturalWidth || 1);
              const scaleY = (imgEl.clientHeight || 1) / (imgEl.naturalHeight || 1);

              const [x, y, w, h] = clampBox(box, imgEl.naturalWidth || 1, imgEl.naturalHeight || 1);
              const isSelected = selectedBoxes.some((b) => JSON.stringify(b) === JSON.stringify(box));

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
                    backgroundColor: isSelected ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.3)",
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
