// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../api/firebase";
import { onAuthStateChanged } from "firebase/auth";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDbUser = async (fb) => {
    const token = await fb.getIdToken();
    try {
      const res = await axios.get(`/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const db = res.data || {};
      return {
        uid: fb.uid,
        email: fb.email,
        username: db.username || "익명",
        profileImageUrl: db.profileImageUrl || "/default-profile.png",
        bio: db.bio || "",             // ✅ bio 포함
        token,
      };
    } catch (err) {
      console.error("유저 정보 조회 실패", err);
      return {
        uid: fb.uid,
        email: fb.email,
        username: "익명",
        profileImageUrl: "/default-profile.png",
        bio: "",                      // ✅ bio 기본값
        token,
      };
    }
  };

  // ✅ 외부에서 호출 가능한 갱신 함수
  const refreshUser = async () => {
    const fb = auth.currentUser;
    if (!fb) { setUser(null); return; }
    const u = await fetchDbUser(fb);
    setUser(u);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fb) => {
      if (fb) await refreshUser();
      else setUser(null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

