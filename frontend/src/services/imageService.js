import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../api/firebase";

const getFilePath = (folderName, file) => {
  const extension = file.type.includes("video") ? ".mp4" : ".png";
  const safeName = file.name?.split(".")[0]?.replace(/\s/g, "_") || "file";
  return `${folderName}/${Date.now()}-${safeName}${extension}`;
};

export const uploadFile = async (folderName, file) => {
  try {
    const filePath = getFilePath(folderName, file);
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return { success: true, url };
  } catch (error) {
    console.error("Firebase upload error:", error);
    return { success: false, msg: "Upload failed" };
  }
};

export function getUserImageSrc(srcOrUser) {
  const src = typeof srcOrUser === "string" ? srcOrUser : srcOrUser?.image;
  if (!src) return "/defaultUser.png";
  if (src.startsWith("http") || src.startsWith("blob:")) return src;
  return src.startsWith("/") ? src : `/${src}`;
}