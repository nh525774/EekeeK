// src/pages/Login.jsx
import React, { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../api/firebase";

import ScreenWrapper from "../components/ScreenWrapper";
import Header from "../components/Header";
import Input from "../components/Input";
import Button from "../components/Button";
import Icon from "../assets/icons";

import { styles } from "../constants/styles";
import { theme } from "../constants/theme";
import { hp } from "../helpers/common";

const Login = () => {
  const emailRef = useRef("");
  const passwordRef = useRef("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = useCallback(() => {
    const email = String(emailRef.current || "").trim();
    const pw = String(passwordRef.current || "").trim();

    if (!email || !pw) {
      alert("Please fill all the fields!");
      return false;
    }
    return true;
  }, []);

  const onSubmit = useCallback(async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        emailRef.current,
        passwordRef.current
      );

      const token = await userCredential.user.getIdToken();
      localStorage.setItem("token", token);

      alert("로그인 성공!");
      navigate("/home"); // ✅ 로그인 후 이동할 경로
    } catch (error) {
      alert("로그인 실패: " + (error?.message || "Unknown error"));
      console.error("[Login] signIn error:", error);
    } finally {
      setLoading(false);
    }

    console.log("✅ 로그인 시도:", emailRef.current, "******");
    console.log("✅ navigate 직전 실행됨");
  }, [navigate, validate]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) onSubmit();
  };

  return (
    <ScreenWrapper bg="white">
      <Header title="로그인" showBack={false} />

      <div style={styles.loginContainer}>
        {/* welcome */}
        <div>
          <p style={styles.loginWelcomeText}>Hey,</p>
          <p style={styles.loginWelcomeText}>Welcome Back</p>
        </div>

        {/* form */}
        <div style={styles.loginForm} onKeyDown={handleKeyDown}>
          <p style={{ fontSize: hp(1.5), color: theme.colors.text }}>
            Please login to continue
          </p>

          <Input
            icon={<Icon name="Mail" size={26} strokeWidth={1.6} />}
            placeholder="Enter your email"
            keyboardType="email-address"
            onChange={(value) => (emailRef.current = value)}
          />

          <Input
            icon={<Icon name="Lock" size={26} strokeWidth={1.6} />}
            placeholder="Enter your password"
            type="password"
            onChange={(value) => (passwordRef.current = value)}
          />

          <p
            style={{
              ...styles.forgotPassword,
              cursor: "pointer",
              userSelect: "none",
            }}
            onClick={() => navigate("/forgot-password")}
          >
            Forgot Password?
          </p>

          <Button title={"Login"} loading={loading} onPress={onSubmit} />
        </div>

        {/* footer */}
        <div style={styles.loginFooter}>
          <p style={{ ...styles.loginFooterText, margin: 0 }}>
            Don't have an account?&nbsp;
          </p>
          <span
            onClick={() => navigate("/register")}
            style={{
              ...styles.loginFooterText,
              color: theme.colors.primaryDark,
              fontWeight: theme.fonts.semibold,
              cursor: "pointer",
            }}
          >
            Sign up
          </span>
        </div>
      </div>
    </ScreenWrapper>
  );
};

export default Login;
