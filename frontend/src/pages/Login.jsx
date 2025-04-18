// src/pages/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "./authLayout";
import { loginWithEmail } from "../api/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const { user, token } = await loginWithEmail(email, pw);

      if (!user.emailVerified) {
        alert("이메일 인증이 완료되지 않았습니다. 메일을 확인해주세요.");
        return;
      }
      
      console.log("로그인 성공 - Firebase ID 토큰:", token);

      // 로컬에 저장 or axios 헤더 설정 가능
      localStorage.setItem("firebaseToken", token);

      alert("로그인 성공!");
      // 페이지 이동 예시 → 홈 또는 피드
      navigate("/MainPage");
    } catch (err) {
      alert("로그인 실패: " + err.message);
    }
  };
  
  return (
    <AuthLayout>
      <h2 className="text-3xl font-bold text-center text-blue-600 mb-6">로그인</h2>

      <input
        type="text"
        placeholder="이메일 또는 아이디"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full box-border px-4 py-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="password"
        placeholder="비밀번호"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        className="w-full box-border px-4 py-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button 
      onClick={handleLogin}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">
        로그인
      </button>

      <div className="text-sm text-center text-blue-600 mt-3 hover:underline cursor-pointer">
        비밀번호를 잊으셨나요?
      </div>

      <div className="mt-6 border-t pt-4 text-center">
        <span className="text-gray-600">계정이 없으신가요? </span>
        <Link to="/register" className="text-blue-600 font-semibold hover:underline">
          회원가입
        </Link>
      </div>
    </AuthLayout>
  );
};

export default Login;
