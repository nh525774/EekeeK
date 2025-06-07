import axios from "axios";
import { auth } from "../api/firebase";
import { uploadFile } from "./imageService";

export const createOrUpdatePost = async (post) => {
  let uploadResult = null;
  let isImage = false;
    try {
        //upload image
        if (post.file && typeof post.file == 'object') {
            isImage = post.file.type.includes("image");
            const folderName = isImage ? "postImages" : "postVideos";

      uploadResult = await uploadFile(folderName, post.file); // uri 말고 file 자체 넘김
      if (uploadResult.success) {
        post.file = uploadResult.url; // 백엔드에는 URL만 넘김
      } else {
        return uploadResult;
      }
    }

    const token = await auth.currentUser.getIdToken();
    const user = auth.currentUser;
    const newPostData = {
      userId: user.uid,
      title: post.title || "기본 제목",   // ✅ 사용자가 작성한 제목 or 기본값
      content: post.content || "",
      imageUrl: isImage ? uploadResult.url : "", //업로드이미지URL
      videoUrl: !isImage ? uploadResult.url : "",
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