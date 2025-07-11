import axios from "axios";
import { auth } from "../api/firebase";
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
  for (const file of post.files) {
    const isImage = file.type.includes("image");
    const isVideo = file.type.includes("video");

    const formData = new FormData();
    formData.append(isImage ? "image" : "video", file);
    formData.append("selected", JSON.stringify(["faces", "phones", "license_plates", "addresses", "location_sensitive"]));

    const endpoint = isImage ? "/api/protect-mosaic" : "/api/protect-video-mosaic";

    const response = await axios.post(endpoint, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    if (!response.data?.url) {
      return { success: false, msg: "모자이크 처리 실패" };
    }

    const fullUrl = baseUrl + response.data.url;
    if (isImage) imageUrls.push(fullUrl);
    else if (isVideo) videoUrl = fullUrl; // 하나만 처리한다는 전제
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