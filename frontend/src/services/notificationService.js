import axios from "axios";
import { auth } from "../api/firebase";

async function authHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export const getMyNotifications = async () => {
  const headers = await authHeaders();
  const { data } = await axios.get("/api/notifications/me", { headers });
  return data?.data || [];
};

export const createNotification = async ({ receiverId, message, type, data }) => {
  const headers = await authHeaders();
  const { data: res } = await axios.post("/api/notifications", { receiverId, message, type, data }, { headers });
  return res?.data;
};
