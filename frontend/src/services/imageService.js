// src/services/imageService.js

/**
 * 유저 이미지가 있으면 그대로, 없으면 기본 이미지 반환
 */
export const getUserImageSrc = (imagePath) => {
  if (imagePath) {
    return { uri: imagePath };
  } else {
    return require("../assets/images/defaultUser.png");
  }
};

/**
 * 파일 업로드용 경로 생성 함수 (실제 업로드 아님)
 */
export const uploadFile = async (folderName, fileUri, isImage = true) => {
  try {
    const fileName = getFilePath(folderName, isImage);

    // ⚠️ 실제로는 여기에 Firebase Storage 업로드 or 서버로 업로드 로직 필요
    // 일단 모의 업로드 URL 반환
    const fakeUploadedUrl = `https://your-cdn.com/${fileName}`;

    return { success: true, url: fakeUploadedUrl };
  } catch (error) {
    console.log("file upload error: ", error);
    return { success: false, msg: "Could not upload media" };
  }
};

export const getFilePath = (folderName, isImage) => {
  return `${folderName}/${Date.now()}${isImage ? ".png" : ".mp4"}`;
};
