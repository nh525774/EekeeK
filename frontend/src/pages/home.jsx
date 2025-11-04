import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import logo from "../assets/logo7.png";

// ✅ 공통 배너 (항상 렌더, 닫기 가능)
function RiskPersistentBanner({ risk, isNewDevice, userId }) {
  const [visible, setVisible] = useState(true);

  // --- 신호 추출 ---
  const reasons = Array.isArray(risk?.reasons) ? risk.reasons : [];
  const isRapid =
    reasons.includes("COUNTRY_CHANGE") ||
    reasons.includes("CITY_FAR_CHANGE") ||
    reasons.includes("RAPID_MOVE_24H_1000KM");
  const isNew = !!isNewDevice || reasons.includes("NEW_DEVICE");

  // --- 레벨/메시지 결정
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
  const key = userId ? `eek_banner_close_v2_${userId}` : null;
  useEffect(() => {
    if (!key) return;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (level === "danger") return setVisible(true);
      if (level === "yellow" || level === "orange") {
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (Date.now() - (data.at || 0) < ONE_DAY) {
          setVisible(false);
        }
        return;
      }
      setVisible(!data.closed);
    } catch {}
  }, [key, level]);

  const handleClose = () => {
    setVisible(false);
    if (!key) return;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ closed: true, at: Date.now(), level })
      );
    } catch {}
  };

  if (!visible) return null;

  const palette = {
    danger: { bg: "#d32f2f", fg: "#fff", border: "#b71c1c" }, // 빨강
    yellow: { bg: "#fbc02d", fg: "#111", border: "#f57f17" }, // 노랑
    orange: { bg: "#fb8c00", fg: "#111", border: "#ef6c00" }, // 주황
    safe: { bg: "#2e7d32", fg: "#fff", border: "#1b5e20" }, // 초록
  }[level];

  return (
    <div
      style={{
        padding: 12,
        margin: "8px 0 12px",
        borderRadius: 12,
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
      className="shadow-soft"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span>{title}</span>
        <span style={{ fontSize: 14, opacity: 0.95, fontWeight: 500 }}>
          {detail}
        </span>
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
        className="btn-ghost rounded-full px-2"
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
  const ranRef = useRef(false);

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
        image: data?.profileImageUrl
          ? getUserImageSrc(data.profileImageUrl)
          : "/defaultUser.png",
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

  const load = async (lim) => {
    setLoading(true);
    try {
      const res = await fetchPosts(lim);
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
    // auth가 준비되면(또는 바뀌면) 다시 로드 → mutual/eekrew 반영
    load(limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.currentUser?.uid]);

  const getPosts = async () => {
    if (!hasMore || loading) return;
    const next = limit + 5;
    await load(next);
    limit = next;
  };

  const headerName =
    me?.name || authUser?.username || authUser?.name || "User";

  const avatarUrl = useMemo(() => {
  const raw =
    me?.image ||
    authUser?.profileImageUrl ||
    authUser?.image ||
    "/defaultUser.png";

  if (!raw) return "/defaultUser.png";

  return raw.startsWith("http") || raw.startsWith("blob:")
    ? raw
    : getUserImageSrc(raw);
}, [me?.image, authUser?.profileImageUrl, authUser?.image]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;

    async function run() {
      try {
        const token = await user.getIdToken();

        // 1) 보안 출처가 아니면(HTTP) 또는 geolocation이 없으면 건너뛰기
        const canUseGeo =
          typeof window !== "undefined" &&
          window.isSecureContext && // HTTPS 또는 localhost
          "geolocation" in navigator;

        // 2) 권한 미리 확인(있으면만 시도)
        let coords = null;
        if (canUseGeo && navigator.permissions?.query) {
          try {
            const perm = await navigator.permissions.query({
              name: "geolocation",
            });
            if (perm.state === "granted" || perm.state === "prompt") {
              coords = await new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                  (pos) =>
                    resolve({
                      lat: pos.coords.latitude,
                      lng: pos.coords.longitude,
                    }),
                  () => resolve(null), // 실패 시 무시
                  {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000,
                  }
                );
              });
            }
          } catch {
            // 권한 조회 실패 → 좌표 없이 진행
          }
        }

        // 3) 좌표가 있으면 포함, 없으면 없이 호출
        const payload = coords ? { lat: coords.lat, lng: coords.lng } : {};
        const { data } = await axios.post("/api/me", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (cancelled) return;

        const r = data?.risk;
        setRisk(r ? r : { score: 0 });
        setIsNewDevice(!!data?.isNewDevice);
      } catch (e) {
        if (!cancelled) {
          console.warn("risk check skipped/failed:", e?.message || e);
          setRisk(null);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [auth.currentUser?.uid]);

  /*
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
  */

  return (
    <ScreenWrapper bg="white">
      {/* ---- Modern wrapper: 전역 배경/여백(기능 영향 없음) ---- */}
      <div className="min-h-screen bg-white text-foreground">
        <div className="w-full mx-0 px-0 py-0">
          {/* 상단 헤더바 (기존 inline 스타일 유지 + 보조 클래스만 추가) */}
          <div
            style={{
              ...styles.header,
              position: "sticky", // ✅ 스크롤해도 위에 고정
              top: 0,
              backdropFilter: "blur(12px)",
              backgroundColor: "rgba(255,255,255,0.2)",
              zIndex: 1000,
            }}
            className="header-blur flex items-center justify-start py-3 pl-3 pr-1 border-b border-border shadow-sm gap-3"
          >
            <div className="h-10 w-[140px] overflow-hidden flex items-center justify-center">
              <img
                src={logo}
                alt="EekeeK Logo"
                className="h-full w-auto block object-contain"
                style={{ transform: "translateY(0)" }}
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>

            <div
              style={styles.icons}
              className="flex h-14 items-center gap-3 sm:gap-6 ml-auto justify-start mr-4"
            >
              <button
                onClick={() => navigate("/deepfake-filter")}
                title="딥페이크 방지 필터"
                style={{
                  background: "none",
                  border: "none",
                  outline: "none",
                  padding: 0,
                  margin: 0,
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#494949", // ✅ 다른 아이콘 기본색 (text-gray-500~600 톤)
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = theme.colors.primary)
                }
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6B7280")}
              >
                {/* 🛡 EekeeK 딥페이크 필터 아이콘 */}
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor" // ✅ currentColor로 통일
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transition: "transform 0.2s ease",
                  }}
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </button>

              <span
                onClick={() => navigate("/search")}
                style={{ cursor: "pointer" }}
                className="btn-ghost rounded-xl p-0 h-10 w-10 flex items-center justify-center leading-none"
              >
                <Icon
                  name="Search"
                  size={hp(3.2)}
                  strokeWidth={2}
                  color={theme.colors.text}
                />
              </span>
              <span
                onClick={() => navigate("/notifications")}
                style={{ cursor: "pointer" }}
                className="btn-ghost rounded-xl p-1"
              >
                <Icon
                  name="Heart"
                  size={hp(3.2)}
                  strokeWidth={2}
                  color={theme.colors.text}
                />
              </span>
              <span
                onClick={() => navigate("/uploadPage")}
                style={{ cursor: "pointer" }}
                className="btn-ghost rounded-xl p-1"
              >
                <Icon
                  name="Plus"
                  size={hp(3.2)}
                  strokeWidth={2}
                  color={theme.colors.text}
                />
              </span>
              <span
                onClick={() => navigate("/profile")}
                style={{ cursor: "pointer" }}
                className="flex items-center gap-2"
              >
                <img
                  key={avatarUrl}
                  src={avatarUrl}
                  alt="User avatar"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: theme.radius?.sm || 8,
                    border: "1px solid hsl(var(--border))",
                    objectFit: "cover",
                  }}
                  className="shadow-soft"
                />
                <span className="hidden sm:inline font-semibold">
                  {headerName}
                </span>
              </span>
            </div>
          </div>

          {/* ✅ 보안 배너 */}
          <RiskPersistentBanner
            risk={risk}
            isNewDevice={isNewDevice}
            userId={auth.currentUser?.uid}
          />

          {/* 피드 영역 */}
          <div className="card-glass shadow-soft border-gradient rounded-2xl p-4 sm:p-6">
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
        </div>
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
    position: "fixed", // 상단 고정
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000, // 피드 위에 항상 보이게
    height: 56, // 헤더 높이 (h-[56px]과 맞춤)
    backgroundColor: theme.colors.primary, // 기존 브랜드 컬러 유지 (#c0d86e 등)
    paddingLeft: wp(4),
    paddingRight: wp(4),
    paddingTop: wp(2), // 살짝 세로 여유
    paddingBottom: wp(2),
    margin: 0, // 상하 여백 제거
    borderRadius: 0, // 둥근모서리 제거
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)", // 요즘식 얇은 그림자
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
