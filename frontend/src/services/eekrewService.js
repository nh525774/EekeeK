// src/services/eekrewService.js
import axios from "axios";
import { auth } from "../api/firebase";

const withAuth = async () => {
  const u = auth.currentUser;
  if (!u) return {};
  const t = await u.getIdToken();
  return { headers: { Authorization: `Bearer ${t}` } };
};

export const getMyEekrewUsers = async () => {
  const cfg = await withAuth();
  const { data } = await axios.get("/api/eekrew/my-users", cfg);
  return Array.isArray(data) ? data : (data?.users || []);
};

export const getIsInEekrew = async (userId) => {
  const cfg = await withAuth();
  const { data } = await axios.get(`/api/eekrew/is/${userId}`, cfg);
  return !!data?.inEekrew;
};

export const toggleEekrew = async (userId) => {
  const cfg = await withAuth();
  const { data } = await axios.post(`/api/eekrew/toggle/${userId}`, null, cfg);
  return !!data?.inEekrew;
};