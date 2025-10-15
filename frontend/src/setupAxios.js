import axios from "axios";
import { auth } from "./api/firebase";

// 모든 요청을 백엔드로 프록시 시키기
axios.defaults.baseURL = "";

// 토큰 자동 첨부
axios.interceptors.request.use(async (config) => {
  if (auth.currentUser) {
    const t = await auth.currentUser.getIdToken();
    config.headers = { ...(config.headers||{}), Authorization: `Bearer ${t}` };
  }
  return config;
});
export {};
