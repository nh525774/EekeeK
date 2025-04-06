// src/pages/Login.jsx
import React from "react";
import { Link } from "react-router-dom";
import AuthLayout from "./authLayout";

const Login = () => {
  return (
    <AuthLayout>
      <h2 className="text-3xl font-bold text-center text-blue-600 mb-6">로그인</h2>

      <input
        type="text"
        placeholder="이메일 또는 아이디"
        className="w-full box-border px-4 py-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="password"
        placeholder="비밀번호"
        className="w-full box-border px-4 py-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">
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
