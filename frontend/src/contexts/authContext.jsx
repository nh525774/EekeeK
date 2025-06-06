// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../api/firebase";
import { onAuthStateChanged } from "firebase/auth";
import axios from "axios";

// 1. Context 생성
const AuthContext = createContext();

// 2. Provider 정의
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();

        try {
          const res = await axios.get(
            `/api/users/firebase/${firebaseUser.uid}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          const dbUser = res.data.success
            ? res.data.data
            : { username: "익명" };

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            username: dbUser.username,
            profileImageUrl: dbUser.profileImageUrl || "/default-profile.png",
            token,
          });
        } catch (err) {
          console.error("유저 정보 조회 실패", err);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            username: "익명",
            profileImageUrl: "/default-profile.png",
            token,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Context 호출 훅
export const useAuth = () => useContext(AuthContext);
