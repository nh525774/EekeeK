import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getIsInEekrew, toggleEekrew } from "../services/eekrewService";

/**
 * mode = "self" | "profile"
 * - self: 내 프로필에서 목록 페이지로 이동
 * - profile: 남의 프로필에서 토글(추가/제거)
 */
export default function EekrewButton({ mode, targetUserId, compact = false }) {
  const nav = useNavigate();
  const [active, setActive] = useState(false); // profile 모드에서만 사용
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === "profile" && targetUserId) {
      getIsInEekrew(targetUserId)
        .then(setActive)
        .catch(() => setActive(false));
    }
  }, [mode, targetUserId]);

  if (mode === "self") {
    return (
      <button
        onClick={() => nav("/eekrew")}
        style={{
          padding: compact ? "6px 10px" : "8px 14px",
          borderRadius: 999,
          border: "1px solid #e5e7eb",
          fontWeight: 700,
          background: "#ECFDF5",
          color: "#14532d",
          boxShadow: "0 1px 6px rgba(16,185,129,.25)",
        }}
      >
        eeKrew
      </button>
    );
  }

  // mode === "profile"
  const onToggle = async () => {
    if (loading) return;
    try {
      setLoading(true);
      const next = await toggleEekrew(targetUserId);
      setActive(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={onToggle}
      disabled={loading}
      title={active ? "내 eekrew에서 제거" : "내 eekrew에 추가"}
      style={{
        padding: compact ? "6px 10px" : "8px 14px",
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        fontWeight: 700,
        background: active ? "#ECFDF5" : "#fff", // ★ 채워짐/빈 상태
        color: active ? "#14532d" : "#111827",
        boxShadow: active ? "0 1px 6px rgba(16,185,129,.25)" : "none",
        opacity: loading ? 0.6 : 1,
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      eeKrew
    </button>
  );
}
