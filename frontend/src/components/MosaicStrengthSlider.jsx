import { useCallback, useMemo } from "react";

/**
 * MosaicStrengthSlider (Modern / IG-style)
 * - Flat & clean: 얇은 레일, subtle gradient fill, 작은 화이트 썸
 * - step=25 스냅 (0/25/50/75/100)
 * - 하단에 작은 점(dots) 눈금 + 라벨(옵션)
 */
export default function MosaicStrengthSlider({
  value,
  defaultValue = 50,
  min = 0,
  max = 100,
  step = 25,
  onChange,
  onCommit,
  label = "모자이크 강도",
  disabled = false,
  id = "mosaic-strength",
  trackColor = "#B3F2EC", // 분홍 필
  showDots = true,
  showLabels = true,
  tickValues = [0, 25, 50, 75, 100],
}) {
  const vNow = typeof value === "number" ? value : defaultValue;

  const pct = useMemo(() => {
    const clamped = Math.min(max, Math.max(min, vNow));
    return ((clamped - min) / (max - min)) * 100;
  }, [vNow, min, max]);

  const handleInput = useCallback(
    (e) => onChange?.(Number(e.target.value)),
    [onChange]
  );

  const handleCommit = useCallback(() => onCommit?.(vNow), [onCommit, vNow]);

  // sizes
  const railH = 8; // 얇은 레일
  const thumb = 22; // 작은 썸

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-gray-800"
      >
        {label}
      </label>

      <div className="relative w-full" style={{ height: 64 }}>
        {/* 레일(배경) */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "36%",
            transform: "translateY(-50%)",
            height: railH,
            borderRadius: 9999,
            background: "#F2F2F2", // gray-200
          }}
        />

        {/* 채워진 분홍 필(은은한 그라데이션) */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: "36%",
            transform: "translateY(-50%)",
            height: railH,
            width: `${pct}%`,
            borderRadius: 9999,
            background: `linear-gradient(180deg, ${trackColor}, #B3F2EC)`,
          }}
        />

        {/* 실제 range input (투명) */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={vNow}
          disabled={disabled}
          onInput={handleInput}
          onChange={handleInput}
          onMouseUp={handleCommit}
          onKeyUp={handleCommit}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={vNow}
          className="relative z-10 w-full bg-transparent"
          style={{
            WebkitAppearance: "none",
            height: Math.max(thumb, railH) + 6,
            cursor: disabled ? "not-allowed" : "pointer",
            outline: "none",
          }}
        />

        {/* 작은 점(Dots) 눈금 */}
        {showDots && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "36%",
              transform: "translateY(calc(-50% + 16px))", // 레일 아래
              display: "flex",
              justifyContent: "space-between",
              padding: "0 2px",
            }}
          >
            {tickValues.map((t) => (
              <span
                key={`dot-${t}`}
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: 9999,
                  background: t === vNow ? "#9ca3af" : "#d1d5db", // 활성 점 살짝 진하게
                }}
              />
            ))}
          </div>
        )}

        {/* 숫자 라벨 */}
        {showLabels && (
          <div
            className="select-none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              justifyContent: "space-between",
              padding: "0 2px",
              fontSize: 12,
              color: "#6b7280",
            }}
          >
            {tickValues.map((t) => (
              <span key={`label-${t}`}>{t}</span>
            ))}
          </div>
        )}

        {/* 브라우저별 썸 스타일 */}
        <style>{`
          /* 우리는 레일을 직접 그림 */
          input[type="range"]::-webkit-slider-runnable-track { height: 0; background: transparent; }
          input[type="range"]::-moz-range-track { height: 0; background: transparent; }
          input[type="range"]::-ms-track { height: 0; background: transparent; border-color: transparent; color: transparent; }

          /* WebKit thumb */
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: ${thumb}px;
            width: ${thumb}px;
            border-radius: 50%;
            background: #fff;
            border: 1px solid #e5e7eb; /* 얇은 라인 */
            box-shadow: 0 2px 6px rgba(0,0,0,0.12); /* subtle */
            margin-top: ${-(thumb / 2) + railH / 2}px; /* 수직 정렬 */
            transition: transform .12s ease;
          }
          input[type="range"]:active::-webkit-slider-thumb {
            transform: scale(1.06);
          }

          /* Firefox thumb */
          input[type="range"]::-moz-range-thumb {
            height: ${thumb}px;
            width: ${thumb}px;
            border-radius: 50%;
            background: #fff;
            border: 1px solid #e5e7eb;
            box-shadow: 0 2px 6px rgba(0,0,0,0.12);
            transition: transform .12s ease;
          }
          input[type="range"]:active::-moz-range-thumb { transform: scale(1.06); }
        `}</style>
      </div>
    </div>
  );
}
export function strengthToBlockSize(strength, { min = 4, max = 60 } = {}) {
  const s = Math.min(100, Math.max(0, Number(strength) || 0));
  const size = Math.round(min + (max - min) * (s / 100));
  return size % 2 === 0 ? size + 1 : size;
}
/*
export function strengthToBlockSize(
  strength,
  { min = 2, max = 40, curve = 1.6 } = {}   // ← 상한 ↓, 곡선 추가
) {
  const s = Math.min(100, Math.max(0, Number(strength) || 0));
  // 곡선 매핑: 낮은 강도에서 완만, 높은 강도에서 급격
  const t = Math.pow(s / 100, curve);
  let size = Math.round(min + (max - min) * t);
  if (size < 2) size = 2;
  return size; // 짝/홀 구분 필요 없음(타일 px)
}
*/
