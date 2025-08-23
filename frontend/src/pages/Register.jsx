// src/pages/Register.jsx
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerWithEmail } from "../api/auth";
import { auth } from "../api/firebase";
import ScreenWrapper from "../components/ScreenWrapper";
import Header from "../components/Header";
import { styles } from "../constants/styles";
import { hp } from "../helpers/common";
import { theme } from "../constants/theme";
import Input from "../components/Input";
import Icon from "../assets/icons";
import Button from "../components/Button";

const Register = () => {
  const emailRef = useRef("");
  const userRef = useRef("");
  const passwordRef = useRef("");
  const passwordCheck = useRef("");

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (passwordRef.current !== passwordCheck.current) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      setLoading(true);

      // 1) Firebase Auth 계정 생성
      const { user } = await registerWithEmail(emailRef.current, passwordRef.current);

      // 2) ID 토큰 발급
      const token = await user.getIdToken(true);

      // 3) 백엔드에 프로필 문서 생성 (username 필수)
      const username = (userRef.current || "").trim();
      if (!username) {
        alert("이름(닉네임)을 입력해 주세요.");
        return;
      }

      const resp = await fetch(`/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, bio: "", profileImageUrl: "" }),
      });

      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j?.message || `프로필 생성 실패 (${resp.status})`);
      }

      alert("인증 메일을 발송했습니다. 메일을 확인하고 인증을 완료해 주세요.");
      navigate("/login");
    } catch (err) {
      alert("회원가입 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper bg="white">
      <Header title="회원가입" showBack />
      <div style={styles.loginContainer}>
        <div>
          <p style={styles.loginWelcomeText}>Let's</p>
          <p style={styles.loginWelcomeText}>Get Started</p>
        </div>
        <div style={styles.loginForm}>
          <p style={{ fontSize: hp(1.5), color: theme.colors.text }}>
            Please fill the details to create an account
          </p>
          <Input
            icon={<Icon name="User" size={26} strokeWidth={1.6} />}
            placeholder="Enter your name"
            onChange={(v) => (userRef.current = v?.target ? v.target.value : v)}
          />
          <Input
            icon={<Icon name="Mail" size={26} strokeWidth={1.6} />}
            placeholder="Enter your email"
            onChange={(v) => (emailRef.current = v?.target ? v.target.value : v)}
          />
          <Input
            icon={<Icon name="Lock" size={26} strokeWidth={1.6} />}
            placeholder="Enter your password"
            type="password"
            onChange={(v) => (passwordRef.current = v?.target ? v.target.value : v)}
          />
          <Input
            icon={<Icon name="Lock" size={26} strokeWidth={1.6} />}
            placeholder="Re-Enter your password"
            type="password"
            onChange={(v) => (passwordCheck.current = v?.target ? v.target.value : v)}
          />
          <Button title="Sign up" loading={loading} onPress={handleRegister} />
        </div>
        <div style={styles.loginFooter}>
          <p style={{ ...styles.loginFooterText, margin: 0 }}>
            Already have an account!&nbsp;
          </p>
          <span
            onClick={() => navigate("/login")}
            style={{
              ...styles.loginFooterText,
              color: theme.colors.primaryDark,
              fontWeight: theme.fonts.semibold,
              cursor: "pointer",
            }}
          >
            Login
          </span>
        </div>
      </div>
    </ScreenWrapper>
  );
};

export default Register;
