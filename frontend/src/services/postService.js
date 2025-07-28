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

    if (typeof post.file === "string") {
      // 🔹 모자이크된 static URL이 들어온 경우 > 전체 url로 변환
      const isImage = post.file.endsWith(".jpg") || post.file.endsWith(".jpeg") || post.file.endsWith(".png");
      const fullUrl = post.file.startsWith("http") ? post.file : baseUrl + post.file;

      if (isImage) imageUrls.push(fullUrl);
      else videoUrl = fullUrl;
    }
    
else if (post.files && Array.isArray(post.files)) {
  const images = post.files.filter(file => file.type.includes("image"));
  const videos = post.files.filter(file => file.type.includes("video"));

  if (images.length > 0) {
    const formData = new FormData();
    for (const img of images) {
      formData.append("image", img);
    }
    formData.append("selected", JSON.stringify([
      "faces", "phones", "license_plates", "addresses", "location_sensitive"
    ]));

    const response = await axios.post(baseUrl + "/api/protect-mosaic", formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    if (!response.data?.urls) {
      return { success: false, msg: "모자이크 처리 실패" };
    }

    imageUrls = response.data.urls.map(url => baseUrl + url);
  }

  if (videos.length > 0) {
    const formData = new FormData();
    formData.append("video", videos[0]);
    formData.append("selected", JSON.stringify([
      "faces", "phones", "license_plates", "addresses", "location_sensitive"
    ]));

    const response = await axios.post(baseUrl + "/api/protect-video-mosaic", formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    if (!response.data?.url) {
      return { success: false, msg: "비디오 모자이크 실패" };
    }

    videoUrl = baseUrl + response.data.url;
  }
}

    const newPostData = {
      userId: user.uid,
      title: post.title || "기본 제목",
      content: post.content || "",
      imageUrls,
      videoUrl,
    };

    const res = await axios.post("/api/posts",newPostData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }); // ← Express API endpoint
    if (res.data.success) {
      return { success: true, data: res.data.data };
    } else {
      return { success: false, msg: res.data.msg || "Post failed" };
    }
  } catch (error) {
    console.error("createPost error: ", error);
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
