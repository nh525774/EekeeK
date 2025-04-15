import React, {useState} from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "./authLayout";
import { registerWithEmail } from "../api/auth";

const Register = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordCheck, setPasswordCheck] = useState("");
  const [agree, setAgree] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!agree) {
      alert("이용약관에 동의해야 가입할 수 있습니다.");
      return;
    }
    if (password !== passwordCheck) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      await registerWithEmail(email, password);
      alert("인증 메일을 발송했습니다. 메일을 확인하고 인증을 완료해 주세요.")
      navigate("/login");
    } catch (err) {
      alert("회원가입 실패: " + err.message);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-3xl font-bold text-center text-blue-600 mb-6">회원가입</h2>

      <input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={ (e) => setEmail(e.target.value)}
        className="w-full box-border px-4 py-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="text"
        placeholder="사용자 이름"
        value={username}
        onChange={ (e) => setUsername(e.target.value)}
        className="w-full box-border px-4 py-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={ (e) => setPassword(e.target.value)}
        className="w-full box-border px-4 py-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="password"
        placeholder="비밀번호 확인"
        value={passwordCheck}
        onChange={ (e) => setPasswordCheck(e.target.value)}
        className="w-full box-border px-4 py-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <label className="flex items-center mb-4 text-sm text-gray-700">
        <input type="checkbox" 
        className="mr-2"
        checked={agree}
        onChange={ (e) => setAgree(e.target.checked)} />
        이용약관에 동의합니다
      </label>

      <button 
      onClick={handleRegister}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">
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
