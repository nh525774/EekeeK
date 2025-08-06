import axios from "axios";

export const getUserById = async (userId) => {
  try {
    const token = localStorage.getItem("firebaseToken"); // Firebase ID token
    const res = await axios.get(`/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return { success: true, user: res.data };
  } catch (error) {
    console.error("유저 조회 에러", error);
    return { success: false };
  }
}; 

export const updateUser = async (userId, data) => {
  try {
    const token = localStorage.getItem("firebaseToken"); // Firebase ID token
    const res = await axios.get(`/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return { success: true, user: res.data };
  } catch (error) {
    console.error("유저 조회 에러", error);
    return { success: false };
  }
}; 