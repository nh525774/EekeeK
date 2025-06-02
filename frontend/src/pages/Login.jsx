// src/pages/Login.jsx

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
  const [loading] = useState(false);

  const onSubmit = async () => {
    if (!emailRef.current || !passwordRef.current) {
      alert("Please fill all the fields!"); // ✅ 웹에서는 window.alert() or alert()
      return;
    }

    // 🟢 good to go
    console.log(
      "Submitting login with:",
      emailRef.current,
      passwordRef.current
    );
    // TODO: 실제 로그인 로직 추가 (e.g. API 호출)
  };
  const navigate = useNavigate();
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
