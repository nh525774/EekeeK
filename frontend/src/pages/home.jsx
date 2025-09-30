import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import ScreenWrapper from "../components/ScreenWrapper";
import { theme } from "../constants/theme";
import { hp, wp } from "../helpers/common";
import Icon from "../assets/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/authContext";
import PostList from "../components/postList";
import { fetchPosts } from "../services/postService";
import { auth } from "../api/firebase";
import { getUserImageSrc } from "../services/imageService";

// ✅ 공통 배너 (항상 렌더, 닫기 가능)
function RiskPersistentBanner({ risk, isNewDevice, userId }) {
  const [visible, setVisible] = useState(true);

  // --- 신호 추출 ---
  const reasons = Array.isArray(risk?.reasons) ? risk.reasons : [];
  const isRapid = reasons.includes("COUNTRY_CHANGE") || reasons.includes("CITY_FAR_CHANGE") || reasons.includes("RAPID_MOVE_24H_1000KM");
  const isNew = !!isNewDevice || reasons.includes("NEW_DEVICE");

  // --- 레벨/메시지 결정 (요구사항)
  // 안전(초록): 기본
  // 주의(노랑): 급격한 좌표 이동(해외 등)
  // 주의(주황): 새 디바이스
  // 고위험(빨강): 새 디바이스 + 급격 좌표 이동
  let level = "safe";
  let title = "✅ 계정은 안전합니다.";
  let detail = "국내 신뢰된 디바이스에서 로그인되었습니다.";

  if (isNew && isRapid) {
    level = "danger";
    title = "🚨 고위험 로그인 감지!";
    detail = "새 디바이스 + 급격한 위치 변경(해외/장거리)";
  } else if (isRapid) {
    level = "yellow";
    title = "⚠️ 주의: 비정상 로그인 징후";
    detail = "급격한 위치 변경(해외/장거리)이 감지되었습니다.";
  } else if (isNew) {
    level = "orange";
    title = "⚠️ 주의: 새로운 디바이스에서 로그인";
    detail = "본인이라면 신뢰 디바이스로 등록됩니다.";
  }

  // --- 로컬스토리지에 닫힘 상태 저장/복구 ---
  const key = userId ? `eek_banner_close_v2_${userId}` : null; // v2: 레벨체계 변경
  useEffect(() => {
    if (!key) return;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const data = JSON.parse(raw);
      // 고위험은 항상 표시
      if (level === "danger") return setVisible(true);
      // 노랑/주황은 24시간 후 재표시
      if (level === "yellow" || level === "orange") {
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (Date.now() - (data.at || 0) < ONE_DAY) {
          setVisible(false);
        }
        return;
      }
      // 안전은 닫힘 지속
      setVisible(!data.closed);
    } catch {// localStorage unavailable (private mode / quota) — ignore}
  }, [key, level]);

  const handleClose = () => {
    setVisible(false);
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify({ closed: true, at: Date.now(), level }));
    } catch (e) {}
  };

  if (!visible) return null;

  const palette = {
    danger: { bg: "#d32f2f", fg: "#fff", border: "#b71c1c" }, // 빨강
    yellow: { bg: "#fbc02d", fg: "#111", border: "#f57f17" }, // 노랑
    orange: { bg: "#fb8c00", fg: "#111", border: "#ef6c00" }, // 주황
    safe: { bg: "#2e7d32", fg: "#fff", border: "#1b5e20" },   // 초록
  }[level];

  return (
    <div
      style={{
        padding: 12,
        margin: "8px 0 12px",
        borderRadius: 10,
        fontWeight: 600,
        color: palette.fg,
        backgroundColor: palette.bg,
        border: `1px solid ${palette.border}`,
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span>{title}</span>
        <span style={{ fontSize: 14, opacity: 0.95, fontWeight: 500 }}>{detail}</span>
      </div>
      <button
        onClick={handleClose}
        aria-label="배너 닫기"
        style={{
          background: "transparent",
          border: "none",
          color: palette.fg,
          fontWeight: "bold",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}

let limit = 5;

const Home = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // 내 프로필(이미지/이름)
  const [me, setMe] = useState(null);

  // ✅ 위험도 상태 + 새 디바이스 플래그(배너 표시용)
  const [risk, setRisk] = useState(null);
  const [isNewDevice, setIsNewDevice] = useState(false);

  const fetchMe = useCallback(async () => {
    try {
      if (!auth.currentUser) return;
      const token = await auth.currentUser.getIdToken();
      const { data } = await axios.get("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMe({
        id: data?._id,
        name: data?.username || "",
        image: data?.profileImageUrl || "",
      });
    } catch (e) {
      console.error("fetch /api/users/me 실패:", e);
      setMe({
        id: null,
        name: authUser?.username || authUser?.name || "",
        image: authUser?.profileImageUrl || authUser?.image || "",
      });
    }
  }, [authUser]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    const onFocus = () => fetchMe();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchMe]);

  // 초기/더보기 포스트 로드 (모양 통일)
  const load = async (lim) => {
    setLoading(true);
    try {
      const res = await fetchPosts(lim); // { success, data: [...] }
      const arr = Array.isArray(res?.data) ? res.data : [];
      setPosts(arr);
      setHasMore(arr.length >= lim);
    } catch (err) {
      console.error("게시글 로드 실패:", err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(limit);
  }, []);

  const getPosts = async () => {
    if (!hasMore || loading) return;
    const next = limit + 5;
    await load(next);
    limit = next;
  };

  const headerName = me?.name || authUser?.username || authUser?.name || "User";
  const avatarUrl = getUserImageSrc(
    me?.image || authUser?.profileImageUrl || authUser?.image || "/defaultUser.png"
  );

  const ranRef = useRef(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || ranRef.current) return;
    ranRef.current = true;

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const token = await user.getIdToken();
          const { data } = await axios.post(
            "/api/me",
            { lat: coords.latitude, lng: coords.longitude },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const r = data?.risk;
          if (r) setRisk(r);
          else setRisk({ score: 0 });

          setIsNewDevice(!!data?.isNewDevice);
        } catch (e) {
          console.error("위험도 체크 실패", e);
          setRisk(null);
        }
      },
      (err) => {
        console.warn("geolocation failed", err);
        setRisk(null);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [auth.currentUser?.uid]);

  return (
    <ScreenWrapper bg="white">
      <div style={styles.container}>
        <div style={styles.header}>
          <p style={styles.title}>EekeeK</p>
          <div style={styles.icons}>
            <span onClick={() => navigate("/search")} style={{ cursor: "pointer" }}>
              <Icon name="Search" size={hp(3.2)} strokeWidth={2} color={theme.colors.text} />
            </span>
            <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}>
              <Icon name="Heart" size={hp(3.2)} strokeWidth={2} color={theme.colors.text} />
            </span>
            <span onClick={() => navigate("/uploadPage")} style={{ cursor: "pointer" }}>
              <Icon name="Plus" size={hp(3.2)} strokeWidth={2} color={theme.colors.text} />
            </span>
            <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>
              <img
                key={avatarUrl}
                src={avatarUrl}
                alt="User avatar"
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: theme.radius?.sm || 8,
                  border: "2px solid #ccc",
                  objectFit: "cover",
                }}
              />
              <span style={{ fontWeight: 600 }}>{headerName}</span>
            </span>
          </div>
        </div>

        {/* ✅ 항상 보이는 로그인/보안 상태 배너 (닫기 버튼 포함) */}
        <RiskPersistentBanner risk={risk} isNewDevice={isNewDevice} userId={auth.currentUser?.uid} />

        <PostList
          posts={posts}
          currentUser={authUser}
          navigate={navigate}
          isLoading={loading}
          loadMore={getPosts}
          hasMore={hasMore}
          meId={me?.id}
        />
      </div>
    </ScreenWrapper>
  );
};

export default Home;

const styles = {
  container: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
  },
  header: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    backgroundColor: theme.colors.primary,
    paddingLeft: wp(4),
    paddingRight: wp(4),
  },
  title: {
    color: theme.colors?.text || "#000",
    fontSize: hp(3.2),
    fontWeight: theme.fonts?.bold || "bold",
  },
  icons: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
  },
};
