import axios from "axios";
import { auth } from "../api/firebase";
import { getIdToken } from "firebase/auth";
//import { uploadFile } from "./imageService";

export const createOrUpdatePost = async (post) => {
  try {
    const token = await auth.currentUser.getIdToken();
    const user = auth.currentUser;

    let imageUrls = [];
    let videoUrl = "";
    const baseUrl = "http://localhost:5000";


// (옵션) location.state.file 문자열도 반영
if (post.file && typeof post.file === "string") {
  const full = post.file.startsWith("http") ? post.file : baseUrl + post.file;
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(full)) imageUrls.push(full);
}

// ✅ files 안의 문자열 URL 수집
if (Array.isArray(post.files)) {
  for (const f of post.files) {
    if (typeof f === "string") {
      const full = f.startsWith("http") ? f : baseUrl + f;
      if (/\.(jpg|jpeg|png|gif|webp)$/i.test(full)) imageUrls.push(full);
    }
  }

  // (필요한 경우에만) 비디오 처리 유지
  const videoFile = post.files.find((f) => typeof f !== "string" && f?.type?.includes("video"));
  if (videoFile) {
    const vForm = new FormData();
    vForm.append("video", videoFile);
    vForm.append(
      "selected",
      JSON.stringify(["faces","phones","license_plates","addresses","location_sensitive"])
    );
    const vRes = await axios.post(baseUrl + "/api/protect-video-mosaic", vForm, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
    });
    if (!vRes.data?.url) return { success:false, msg:"비디오 모자이크 실패" };
    videoUrl = baseUrl + vRes.data.url;
  }
}


    const newPostData = {
      userId: user.uid,
      title: post.title || "기본 제목",
      content: post.content || "",
      imageUrls,   // <- 문자열 URL만 들어감
      videoUrl,
    };

    const res = await axios.post("/api/posts", newPostData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return res.data?.success
      ? { success: true, data: res.data }
      : { success: false, msg: res.data?.msg || "Post failed" };
  } catch (error) {
    console.error("createPost error:", error);
    return { success: false, msg: "Could not create your post" };
  }
};

export const fetchPosts = async (limit = 10) => {
  try {
    const token = localStorage.getItem("firebaseToken");
    const res = await axios.get(`/api/posts?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
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
    const res = await axios.get(`/api/posts/${postId}`);
    if (res.data.success) {
      return res.data.data;
    } else {
      throw new Error("Post not found");
    }
  } catch (error) {
    console.error("fetchPostById error: ", error);
    throw error;
  }

};
export const deletePostById = async (postId) => {
    const token = await getIdToken(auth.currentUser);
    return axios.delete(`/api/posts/${postId}`, {
      headers: {
        Authorization : `Bearer ${token}`,
      },
    });
  };

  export const createPostLike = async (postId) => {
    try {
      const token = await getIdToken(auth.currentUser);
      const res = await axios.get(`/api/posts/${postId}/like`, {
      headers: {
        Authorization: `Bearer ${token}` 
      },
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
      headers: {
        Authorization: `Bearer ${token}` 
      },
    });

    if (res.data.success) {
      return { success: true, likes: res.data.likes };
    } 
    else {
      return { success : false, msg: res.data.msg || "좋아요 취소 실패"};
    }
  } catch (err) {
    console.error("postLike error:", err);
    return { success: false, msg: "좋아요 취소 중 오류 발생" };
  }
  };

  export const createComment = async (postId, text) => {
    try {
      const token = await getIdToken(auth.currentUser);
      const res = await axios.post(`/api/posts/${postId}/comments`, 
        { 
          text,
          userName: auth.currentUser.displayName || "익명",
          userImage: auth.currentUser.photoURL || ""
       }, 
      { 
        headers: {
        Authorization: `Bearer ${token}`, 
      },
     }
      ); 
      return res.data;
    } catch (err) {
    console.error("comment error:", err);
    return { success: false, msg: "댓글 작성 실패" };
  }
};

  export const removeComment = async (postId, commentId) => {
    try {
      const token = await getIdToken(auth.currentUser);
      const res = await axios.delete(`/api/posts/${postId}/comments/${commentId}`, {
      headers: {
        Authorization: `Bearer ${token}` } }
    );
    return res.data;
  } catch (err) {
    console.error("comment error:", err);
    return { success: false, msg: "댓글 삭제 실패" };
  }
  };