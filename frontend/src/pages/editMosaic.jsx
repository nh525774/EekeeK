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

  // --- 미디어(이미지/비디오) 미리보기 관리 ---
  const mediaRef = useRef(null);
  const [isVideo, setIsVideo] = useState(false);
  const blobUrlRef = useRef(null);
  const [imageUrl, setImageUrl] = useState("");

  const revokePrevBlobUrl = () => {
    if (blobUrlRef.current) {
      try { URL.revokeObjectURL(blobUrlRef.current); } catch {}
      blobUrlRef.current = null;
    }
  };

  async function setPreviewFromFile(fileOrUrl) {
    revokePrevBlobUrl();
    try {
      if (fileOrUrl instanceof Blob) {
        const isVid = (fileOrUrl.type || "").startsWith("video/");
        setIsVideo(isVid);
        const u = URL.createObjectURL(fileOrUrl);
        blobUrlRef.current = u;
        setImageUrl(u);
        return;
      }
      if (typeof fileOrUrl === "string") {
        const abs = fileOrUrl.startsWith("http") ? fileOrUrl : baseUrl + fileOrUrl;
        const isVid = /\.(mp4|webm|ogg)(\?.*)?$/i.test(abs);
        setIsVideo(isVid);
        setImageUrl(abs);
        return;
      }
      throw new Error("유효한 미디어 입력이 아닙니다.");
    } catch (e) {
      console.warn("[preview] 미리보기 설정 실패:", e?.message);
      setIsVideo(false);
      setImageUrl("");
    }
  }

  const toFileLike = async (f) => {
    if (f instanceof Blob) return f;
    if (typeof f === "string") {
      let url = f;
      if (!(url.startsWith("blob:") || url.startsWith("data:"))) {
        url = url.startsWith("http") ? url : baseUrl + url;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`리소스 다운로드 실패: ${res.status}`);
      const blob = await res.blob();
      const ext = (blob.type && blob.type.split("/")[1]) || "bin";
      return new File([blob], `media.${ext}`, { type: blob.type || "application/octet-stream" });
    }
    return null;
  };

  // ---------- 상태 ----------
  const [analysis, setAnalysis] = useState({});
  const [mediaTick, setMediaTick] = useState(0);
  const [selectedType, setSelectedType] = useState("faces");
  const [loading, setLoading] = useState(false);
  const [selectedBoxes, setSelectedBoxes] = useState([]);

  const xyxyToXywh = (arr) => {
  if (!Array.isArray(arr) || arr.length !== 4) return [0,0,0,0];
  const [x1, y1, x2, y2] = arr.map(Number);
  return [x1, y1, Math.max(1, x2 - x1), Math.max(1, y2 - y1)];
};

  // ▼ 강도/블록크기
  const [strength, setStrength] = useState(50);
  const blockSize = useMemo(
    () => strengthToBlockSize(100 - strength, { min: 4, max: 60 }),
    [strength]
  );

  useEffect(() => {
    (async () => { await setPreviewFromFile(file); })();
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
          type === "video" ? "/api/protect-video-analyze" : "/api/protect-analyze";

        const res = await fetch(endpoint, { method: "POST", body: formData });
        const data = await res.json();

        // [x1,y1,x2,y2] → [x,y,w,h] 로 정규화 (이미 xywh면 건드리지 않음)
      const normalizeBox = (arr) => {
      if (!Array.isArray(arr) || arr.length !== 4) return [0,0,0,0];
      const [a,b,c,d] = arr.map(Number);
      return (c > a && d > b) ? [a, b, Math.max(1, c - a), Math.max(1, d - b)] : [a,b,c,d];
 };

        const wrapBoxes = (arr) =>
          Array.isArray(arr)
            ? arr.filter(Boolean).map((b) => {
                if (Array.isArray(b) && b.length === 4 && typeof b[0] === "number") {
           return { box: normalizeBox(b) };
         }
                if (Array.isArray(b) && b.length === 4 && typeof b[0] === "object" && b[0] && "x" in b[0]) {
                  return { box: convertPolygonToBox(b) };
                }
                if (b && typeof b === "object" && Array.isArray(b.box)) {
                  return { box: normalizeBox(b.box) };
                }
                return { box: [0, 0, 0, 0] };
              })
            : [];

        const parsed =
          type === "video"
            ? {
                faces: wrapBoxes(data.faces),
                phones: wrapBoxes(data.phones),
                addresses: wrapBoxes(data.addresses),
                location_sensitive: wrapBoxes(data.location_sensitive),
                license_plates: wrapBoxes(data.license_plates),
              }
            : {
                faces: (data.results?.[0]?.faces || []).map((f) => ({ box: xyxyToXywh(f.box) })),
                phones: wrapBoxes(data.results?.[0]?.phones),
                addresses: wrapBoxes(data.results?.[0]?.addresses),
                location_sensitive: wrapBoxes(data.results?.[0]?.location_sensitive),
                license_plates: wrapBoxes(data.results?.[0]?.license_plates),
              };

        setAnalysis(parsed);
        if (!imageUrl && data.thumb_url) {
          const abs = data.thumb_url.startsWith("http") ? data.thumb_url : baseUrl + data.thumb_url;
          setImageUrl(abs);
        }
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
        .filter((box) => Array.isArray(box) && box.length === 4 && box.every(Number.isFinite))
        .map(([x, y, w, h]) => [Math.round(x), Math.round(y), Math.round(x + w), Math.round(y + h)]);

      if (valid.length === 0) {
        alert("선택된 박스가 없습니다.");
        return;
      }

      // 서버 호환성 위해 모두 전송: (키/박스/블록크기)
      formData.append("selected", JSON.stringify([selectedType])); // ex) ["faces"]
      formData.append("selectedBoxes", JSON.stringify(valid));     // [x1,y1,x2,y2] 배열들
      formData.append("block_size", String(blockSize));            // 슬라이더 값

      setLoading(true);
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();

      if (data.error) {
        alert("모자이크 처리 실패: " + data.error);
        return;
      }

      const fileUrl = data.url || (data.urls && data.urls[0]);
      // 항상 /uploads or /static 로 정규화해서 저장(프록시 경로)
      const toProxyPath = (u) => {
   if (!u) return u;
   if (u.startsWith("/")) return u;                       // 이미 상대
   if (u.startsWith("http")) {
     try {
       const { pathname } = new URL(u);
       // .../BUCKET/uploads/xxx  or  .../uploads/xxx  모두 지원
       const m = pathname.match(/\/(?:[^/]+\/)?(uploads|static)\/(.+)/);
       if (m) return `/${m[1]}/${m[2]}`;
     } catch {}
   }
   return u.startsWith("uploads") || u.startsWith("static") ? `/${u}` : u;
 };
 const proxyPath = toProxyPath(fileUrl);      // 예: "/uploads/avatars/xxx.jpg"
 const fullUrl = baseUrl + proxyPath;

      await setPreviewFromFile(fullUrl);

      setFiles((prev) => {
        const cp = [...prev];
        cp[index] = proxyPath;
        return cp;
      });

      setTimeout(() => navigate(-1), 120); 
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
          paddingBottom: 160,
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        {imageUrl && (
          <div style={{ position: "relative", alignSelf: "center", maxWidth: 400 }}>
            {isVideo ? (
              <video
                ref={mediaRef}
                src={imageUrl}
                controls
                onLoadedMetadata={() => setMediaTick((t) => t + 1)}
                style={{ width: "100%", display: "block", borderRadius: 12, border: "1px solid #ccc" }}
              />
            ) : (
              <img
                ref={mediaRef}
                src={imageUrl}
                alt="preview"
                style={{ width: "100%", display: "block", borderRadius: 12, border: "1px solid #ccc" }}
              />
            )}

            {(analysis[selectedType] || []).map((item, i) => {
              const box = item.box;
              if (!isValidBox(box)) return null;

              const el = mediaRef.current;
              if (!el) return null;

              const naturalW = isVideo ? (el.videoWidth || 1) : (el.naturalWidth || 1);
              const naturalH = isVideo ? (el.videoHeight || 1) : (el.naturalHeight || 1);
              const scaleX = (el.clientWidth || 1) / naturalW;
              const scaleY = (el.clientHeight || 1) / naturalH;

              const [x, y, w, h] = clampBox(box, naturalW, naturalH);
              const isSelected =
                selectedBoxes.some((b) => JSON.stringify(b) === JSON.stringify(box));

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
          {["faces", "phones", "addresses", "location_sensitive", "license_plates"].map((type) => {
            const active = selectedType === type;
            const baseShadow = active
              ? "0 6px 14px rgba(0,0,0,0.12)"
              : "0 2px 6px rgba(0,0,0,0.08)";

            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = active
                    ? "0 8px 18px rgba(0,0,0,0.16)"
                    : "0 4px 10px rgba(0,0,0,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = baseShadow;
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = "translateY(1px)";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.10)";
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
                  boxShadow: baseShadow,
                  transition: "box-shadow .12s ease, transform .06s ease",
                }}
              >
                {type === "faces" && "얼굴"}
                {type === "phones" && "전화번호"}
                {type === "addresses" && "주소"}
                {type === "location_sensitive" && "위치"}
                {type === "license_plates" && "차량 번호판"}
              </button>
            );
          })}
        </div>
      </div>

      {/* 하단: 슬라이더 + 적용 버튼 */}
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
          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Button title="모자이크 적용" onPress={handleMosaicApply} loading={loading} />
          </div>
        </div>
      </div>
    </ScreenWrapper>
  );
};

export default EditMosaic;
