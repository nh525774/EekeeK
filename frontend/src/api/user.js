// src/api/user.js
import { getAuth } from "firebase/auth";
import { API_URL } from "./api";

/* 내부: 인증 토큰 */
async function getToken() {
  const user = getAuth().currentUser;
  if (!user) throw new Error("로그인 후 이용 가능합니다.");
  return user.getIdToken(true);
}

/* 내부: 공통 fetch (토큰 자동 첨부) */
async function authedFetch(path, { method = "GET", headers = {}, body } = {}) {
  const token = await getToken();
  const url = `${API_URL}/api${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = data?.msg || data?.error || "";
    } catch (_) {}
    throw new Error(`${method} ${path} 실패: ${res.status} ${res.statusText}${detail ? ` (${detail})` : ""}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* =========== 사용자 =========== */
// 최초 사용자 등록
export async function registerUser({ username, bio, profileImageUrl }) {
  return authedFetch("/users", {
    method: "POST",
    body: { username, bio, profileImageUrl },
  });
}

// 내 프로필 조회
export async function fetchMyProfile() {
  return authedFetch("/users/me");
}

// 내 프로필 수정
export async function updateMyProfile({ username, bio, profileImageUrl }) {
  return authedFetch("/users/me", {
    method: "PATCH",
    body: { username, bio, profileImageUrl },
  });
}

/* =========== EEKREW =========== */
// 내 이크루 사용자 목록
export async function getMyEekrewUsers() {
  return authedFetch("/eekrew/my-users"); // 서버가 { success, users } 또는 배열 반환한다고 가정
}

// 특정 유저가 내 이크루에 포함되어 있는지
export async function getIsInEekrew(userId) {
  if (!userId) throw new Error("userId가 필요합니다.");
  const data = await authedFetch(`/eekrew/is/${userId}`);
  return !!data?.inEekrew;
}

// 이크루 토글(추가/제거)
export async function toggleEekrew(userId) {
  if (!userId) throw new Error("userId가 필요합니다.");
  const data = await authedFetch(`/eekrew/toggle/${userId}`, { method: "POST" });
  return !!data?.inEekrew; // 토글 후 상태
}

// 이크루 피드(내 이크루 사용자들의 공개/이크루 공개 글)
export async function fetchEekrewFeed(limit = 10) {
  const data = await authedFetch(`/eekrew/feed?limit=${limit}`);
  return data?.success ? data.data : data; // 서버 응답 형태에 맞춤
}