// utils/url.js
const API = import.meta.env.VITE_API_URL || "";
const ASSET = import.meta.env.VITE_ASSET_PREFIX || "";

// API 경로
export const apiUrl = (p = "") => `${API}${p}`;

// 업로드/이미지 경로
export const assetUrl = (p = "") =>
  /^https?:\/\//i.test(p) ? p : `${ASSET}${p}`;