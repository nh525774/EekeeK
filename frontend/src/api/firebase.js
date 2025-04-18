import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBL5X7nXyc0ZR7uLWYCC-WE_NJ_BwzooEw",
  authDomain: "triples2-1d0c7.firebaseapp.com",
  projectId: "triples2-1d0c7",
  appId: "1:329500842061:web:133bd12d72c7761ffd6404",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);


// 브라우저 콘솔에서 `auth` 객체를 바로 쓰기 위함
if (typeof window !== "undefined") window.auth = auth;