// src/services/imageService.js
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../api/firebase";

const getFilePath = (folderName, file) => {
  const extension = file.type.includes("video") ? ".mp4" : ".png";
  const safeName = file.name?.split(".")[0]?.replace(/\s/g, "_") || "file";
  return `${folderName}/${Date.now()}-${safeName}${extension}`;
};

/**
 * Firebase Storage에 파일 업로드
 * @param {string} folderName 폴더명 ('postImages' 또는 'postVideos' 등)
 * @param {File} file 브라우저에서 선택된 File 객체
 */

export const uploadFile = async (folderName, file) => {
  try {
    const filePath = getFilePath(folderName, file);
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file); // 실제 업로드
    const url = await getDownloadURL(storageRef); // 다운로드 URL 획득
    return { success: true, url };
  } catch (error) {
    console.log(" Firebase upload error:", error);
    return { success: false, msg: "Upload failed" };
  }
};