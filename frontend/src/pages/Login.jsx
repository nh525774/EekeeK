// src/pages/Login.jsx
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../api/firebase";
import React, { useRef, useState } from "react";
import ScreenWrapper from "../components/ScreenWrapper";
import Header from "../components/Header";
import { styles } from "../constants/styles";
import { hp } from "../helpers/common";
import { theme } from "../constants/theme";
import Input from "../components/Input";
import Icon from "../assets/icons";
import Button from "../components/Button";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async () => {
    if (!emailRef.current || !passwordRef.current) {
      alert("Please fill all the fields!"); // ✅ 웹에서는 window.alert() or alert()
      return;
    }

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
      navigate("/home"); // ✅ 로그인 후 이동할 페이지로 경로 바꿔줘
    } catch (error) {
      alert("로그인 실패: " + error.message);
    } finally {
      setLoading(false);
    }
    console.log("✅ 로그인 시도:", emailRef.current, passwordRef.current);
    console.log("✅ navigate 직전 실행됨");
  };

  return (
    <ScreenWrapper bg="white">
      <Header title="로그인" showBack={false} /> {/* ✅ BackButton 내장 */}
      {/*welcome*/}
      <div style={styles.loginContainer}>
        <div>
          <p style={styles.loginWelcomeText}>Hey,</p>
          <p style={styles.loginWelcomeText}>Welcome Back</p>
        </div>
        {/*form*/}
        <div style={styles.loginForm}>
          <p
            style={{
              fontSize: hp(1.5),
              color: theme.colors.text,
            }}
          >
            Please login to continue
          </p>
          <Input
            icon={<Icon name="Mail" size={26} strokeWidth={1.6} />}
            placeholder="Enter your email"
            onChange={(value) => (emailRef.current = value)}
          />
          <Input
            icon={<Icon name="Lock" size={26} strokeWidth={1.6} />}
            placeholder="Enter your password"
            type="password"
            onChange={(value) => (passwordRef.current = value)}
          />
          <p style={styles.forgotPassword}>Forgot Password?</p>
          {/*button*/}
          <Button title={"Login"} loading={loading} onPress={onSubmit} />
        </div>
        {/*footer*/}
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
