import React from "react";
import { Link } from "react-router-dom";
import AuthLayout from "./authLayout";

const Register = () => {
  return (
    <AuthLayout>
      <h2 className="text-3xl font-bold text-center text-blue-600 mb-6">회원가입</h2>

      <input
        type="email"
        placeholder="이메일"
        className="w-full box-border px-4 py-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="text"
        placeholder="사용자 이름"
        className="w-full box-border px-4 py-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="password"
        placeholder="비밀번호"
        className="w-full box-border px-4 py-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="password"
        placeholder="비밀번호 확인"
        className="w-full box-border px-4 py-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <label className="flex items-center mb-4 text-sm text-gray-700">
        <input type="checkbox" className="mr-2" />
        이용약관에 동의합니다
      </label>

      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">
        회원가입
      </button>

      <div className="mt-6 border-t pt-4 text-center">
        <span className="text-gray-600">이미 계정이 있으신가요? </span>
        <Link to="/" className="text-blue-600 font-semibold hover:underline">
          로그인
        </Link>
      </div>
    </AuthLayout>
  );
};

export default Register;
