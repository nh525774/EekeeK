// src/services/postService.js
import axios from "axios";
import { auth } from "../api/firebase";
import { getIdToken } from "firebase/auth";
import { assetUrl } from "../utils/url";


// 공통: 선택적 토큰 첨부 (비로그인일 때도 안전하게 요청)
const withAuth = async () => {
  const u = auth.currentUser;
  if (!u) return {};
  const t = await getIdToken(u);
  return { headers: { Authorization: `Bearer ${t}` } };
};

// =====================
// 게시글 생성/수정  ✅ 업로드 포함 버전
// =====================
export const createOrUpdatePost = async (post) => {
  try {
    const user = auth.currentUser;
    if (!user) return { success: false, msg: "로그인이 필요합니다." };

    const token = await getIdToken(user);

    const isImg = (u) => /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(String(u || ""));
    const isVid = (u) => /\.(mp4|webm|ogg)(\?.*)?$/i.test(String(u || ""));

    let imageUrls = [];
    let videoUrl = "";

    // (옵션) location.state.file 문자열도 반영
    if (post.file && typeof post.file === "string") {
      const full = assetUrl(post.file);
      if (isVid(full)) videoUrl = full;
      else if (isImg(full)) imageUrls.push(full);
    }

    // files 배열: 문자열 URL + File/Blob 혼재 가능
    if (Array.isArray(post.files)) {
      // 1) 문자열 URL은 그대로 분류
      for (const f of post.files) {
        if (typeof f === "string") {
          const full = assetUrl(f);
          if (isVid(full)) videoUrl = full;
          else if (isImg(full)) imageUrls.push(full);
        }
      }

      // 2) File/Blob 은 업로드 후 반환 URL 사용
      for (const f of post.files) {
        if (typeof f !== "string" && f && typeof f.size === "number") {
          if (f.type?.includes?.("video")) {
            // TODO: 비디오 업로드/모자이크 API 연결 시 여기 분기 추가
          } else {
            // 이미지 업로드: 서버는 필드명 "image"를 사용하며 라우트는 /api/upload 이어야 함
            const fd = new FormData();
            fd.append("image", f);
            const up = await axios.post("/api/upload", fd, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const url = up?.data?.url; // 예: "/uploads/images/xxx.jpg"
            if (url) imageUrls.push(assetUrl(url));
          }
        }
      }
    }

    const newPostData = {
      userId: user.uid,
      title: post.title || "기본 제목",
      content: post.content || "",
      imageUrls,
      videoUrl,
      // visibility: "public" | "mutual" | "eekrew"
      visibility: ["public", "mutual", "eekrew"].includes(post.visibility)
        ? post.visibility
        : "public",
      eeKrewListId: post.eeKrewListId || null, // ← 소문자 d
    };

    const res = await axios.post("/api/posts", newPostData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return res.data?.success
      ? { success: true, data: res.data.data }
      : { success: false, msg: res.data?.message || res.data?.msg || "Post failed" };
  } catch (error) {
    console.error("createPost error:", error);
    return { success: false, msg: "Could not create your post" };
  }
};

// =====================
// 게시글 목록/상세/삭제
// =====================
export const fetchPosts = async (limit = 10) => {
  try {
    const u = auth.currentUser;
    const token = u ? await getIdToken(u) : null;
    const res = await axios.get(`/api/posts?limit=${limit}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (res.data.success) {
      return { success: true, data: res.data.data };
    } else {
      return { success: false, msg: res.data.msg || "Fetch failed" };
    }
  } catch (error) {
    console.error("fetchPosts error: ", error);
    return { success: false, msg: "Could not fetch posts" };
  }
};

export const fetchPostById = async (postId) => {
  try {
    const token = await getIdToken(auth.currentUser);
    const res = await axios.get(`/api/posts/${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.data.success) return res.data.data;
    throw new Error("Post not found");
  } catch (error) {
    console.error("fetchPostById error: ", error);
    throw error;
  }
};

export const deletePostById = async (postId) => {
  const token = await getIdToken(auth.currentUser);
  return axios.delete(`/api/posts/${postId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// =====================
// 좋아요
// =====================
export const createPostLike = async (postId) => {
  try {
    const token = await getIdToken(auth.currentUser);
    const res = await axios.get(`/api/posts/${postId}/like`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.data.success) {
      return { success: true, likes: res.data.likes };
    } else {
      return { success: false, msg: res.data.msg || "좋아요 실패" };
    }
  } catch (err) {
    console.error("createPostLike error:", err);
    return { success: false, msg: "좋아요 중 오류 발생" };
  }
};

export const removePostLike = async (postId) => {
  try {
    const token = await getIdToken(auth.currentUser);
    const res = await axios.get(`/api/posts/${postId}/unlike`, {
      headers: { Authorization: { Authorization: `Bearer ${token}` } }, // (타이포 방지: 아래 줄로 교체)
    });
  } catch (e) {
    // no-op
  }
  try {
    const token = await getIdToken(auth.currentUser);
    const res = await axios.get(`/api/posts/${postId}/unlike`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.data.success) {
      return { success: true, likes: res.data.likes };
    } else {
      return { success: false, msg: res.data.msg || "좋아요 취소 실패" };
    }
  } catch (err) {
    console.error("postLike error:", err);
    return { success: false, msg: "좋아요 취소 중 오류 발생" };
  }
};

// =====================
// 댓글
// =====================
export const createComment = async (postId, text) => {
  try {
    const token = await getIdToken(auth.currentUser);
    const res = await axios.post(
      `/api/posts/${postId}/comments`,
      {
        text,
        userName: auth.currentUser.displayName || "익명",
        userImage: auth.currentUser.photoURL || "",
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.data?.success && res.data?.data) return res.data.data; // ← 댓글 객체만 반환 (contentForViewer 포함)
    return { _error: true, msg: res.data?.msg || "댓글 작성 실패" };
  } catch (err) {
    console.error("comment error:", err);
    return { _error: true, msg: "댓글 작성 실패" };
  }
};

export const removeComment = async (postId, commentId) => {
  try {
    const token = await getIdToken(auth.currentUser);
    const res = await axios.delete(`/api/posts/${postId}/comments/${commentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data; // { success: true, data: { commentId } }
  } catch (err) {
    console.error("comment delete error:", err);
    return { success: false, msg: "댓글 삭제 실패" };
  }
};

// =====================
// EEKREW (이크루) 전용 API
// =====================

// 1) 내 이크루 사용자 목록
export const getMyEekrewUsers = async () => {
  const cfg = await withAuth();
  const { data } = await axios.get("/api/eekrew/my-users", cfg);
  return data; // 서버: { success, users: [...] } 혹은 배열
};

// 2) 특정 유저가 내 이크루에 포함되어 있는지
export const getIsInEekrew = async (userId) => {
  const cfg = await withAuth();
  const { data } = await axios.get(`/api/eekrew/is/${userId}`, cfg);
  return !!data?.inEekrew;
};

// 3) 이크루 토글(추가/제거)
export const toggleEekrew = async (userId) => {
  const cfg = await withAuth();
  const { data } = await axios.post(`/api/eekrew/toggle/${userId}`, null, cfg);
  return !!data?.inEekrew;
};

// 4) 이크루 피드(내 이크루에 속한 사용자들의 공개/이크루-공개 글)
//    백엔드 라우트: GET /api/eekrew/feed?limit=10
export const fetchEekrewFeed = async (limit = 10) => {
  const cfg = await withAuth();
  const { data } = await axios.get(`/api/eekrew/feed?limit=${limit}`, cfg);
  // 서버에서 접근 제어(visibility === 'eekrew' 포함) 후 반환한다고 가정
  if (data?.success) return { success: true, data: data.data };
  return { success: false, msg: data?.msg || "Eekrew feed fetch failed" };
};
