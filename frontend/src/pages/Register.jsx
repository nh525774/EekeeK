// src/pages/Register.jsx
import React, { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { registerWithEmail } from "../api/auth";
import { auth } from "../api/firebase";

import ScreenWrapper from "../components/ScreenWrapper";
import Header from "../components/Header";
import Input from "../components/Input";
import Button from "../components/Button";
import Icon from "../assets/icons";

import { styles } from "../constants/styles";
import { theme } from "../constants/theme";
import { hp } from "../helpers/common";

const Register = () => {
  const emailRef = useRef("");
  const userRef = useRef("");
  const passwordRef = useRef("");
  const passwordCheck = useRef("");

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = useCallback(async () => {
    const email = (emailRef.current || "").trim();
    const username = (userRef.current || "").trim();
    const password = (passwordRef.current || "").trim();
    const confirm = (passwordCheck.current || "").trim();

    if (!email || !username || !password || !confirm) {
      alert("모든 필드를 입력해주세요.");
      return;
    }
    if (password !== confirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      setLoading(true);

      // 1) Firebase Auth 계정 생성
      const { user } = await registerWithEmail(email, password);

      // 2) ID 토큰 발급
      const token = await user.getIdToken(true);

      // 3) 백엔드 프로필 생성 요청
      const resp = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          bio: "",
          profileImageUrl: "",
        }),
      });

      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j?.message || `프로필 생성 실패 (${resp.status})`);
      }

      alert("인증 메일을 발송했습니다. 메일을 확인하고 인증을 완료해주세요.");
      navigate("/login");
    } catch (err) {
      console.error("[Register] Error:", err);
      alert("회원가입 실패: " + (err.message || "알 수 없는 오류"));
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) handleRegister();
  };

  return (
    <ScreenWrapper bg="white">
      <Header title="회원가입" showBack />

      <div style={styles.loginContainer} onKeyDown={handleKeyDown}>
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
            keyboardType="email-address"
            onChange={(v) =>
              (emailRef.current = v?.target ? v.target.value : v)
            }
          />

          <Input
            icon={<Icon name="Lock" size={26} strokeWidth={1.6} />}
            placeholder="Enter your password"
            type="password"
            onChange={(v) =>
              (passwordRef.current = v?.target ? v.target.value : v)
            }
          />

          <Input
            icon={<Icon name="Lock" size={26} strokeWidth={1.6} />}
            placeholder="Re-Enter your password"
            type="password"
            onChange={(v) =>
              (passwordCheck.current = v?.target ? v.target.value : v)
            }
          />

          <Button title="Sign up" loading={loading} onPress={handleRegister} />
        </div>

        <div style={styles.loginFooter}>
          <p style={{ ...styles.loginFooterText, margin: 0 }}>
            Already have an account?&nbsp;
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
