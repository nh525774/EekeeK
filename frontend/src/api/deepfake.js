import axios from "axios";


/** 사진 업로드 + 필터 자동 적용 */
export async function uploadAndFilterImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await axios.post("/api/deepfake/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  // data = { imageUrl, originalUrl }
  return data;
}
