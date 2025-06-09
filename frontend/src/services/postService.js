import axios from "axios";
import { auth } from "../api/firebase";
import { uploadFile } from "./imageService";

export const createOrUpdatePost = async (post) => {
  try {
    const token = await auth.currentUser.getIdToken();
    const user = auth.currentUser;

    let isImage = false;
    let imageUrl = "";
    let videoUrl = "";

    if (typeof post.file === "string") {
      // 🔹 모자이크된 static URL이 들어온 경우
      isImage = post.file.endsWith(".jpg") || post.file.endsWith(".jpeg") || post.file.endsWith(".png");
      if (isImage) imageUrl = post.file;
      else videoUrl = post.file;
    } else if (post.file && typeof post.file === "object") {
      // 🔹 로컬 파일 (File 객체)인 경우 → Firebase 업로드
      isImage = post.file.type.includes("image");
      const folderName = isImage ? "postImages" : "postVideos";

      const uploadResult = await uploadFile(folderName, post.file);
      if (!uploadResult.success) return uploadResult;

      if (isImage) imageUrl = uploadResult.url;
      else videoUrl = uploadResult.url;
    }

    const newPostData = {
      userId: user.uid,
      title: post.title || "기본 제목",
      content: post.content,
      imageUrl,
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

export const fetchPosts = async () => {
    try {
      const res = await axios.get("/api/posts");
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