import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerWithEmail } from "../api/auth";
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
  const [loading] = useState(false);

  const handleRegister = async () => {
    if (passwordRef !== passwordCheck) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      await registerWithEmail(emailRef, passwordRef);
      alert("인증 메일을 발송했습니다. 메일을 확인하고 인증을 완료해 주세요.");
      navigate("/login");
    } catch (err) {
      alert("회원가입 실패: " + err.message);
    }
  };

  return (
    <ScreenWrapper bg="white">
      <Header title="회원가입" showBack /> {/* ✅ BackButton 내장 */}
      {/*welcome*/}
      <div style={styles.loginContainer}>
        <div>
          <p style={styles.loginWelcomeText}>Let's</p>
          <p style={styles.loginWelcomeText}>Get Started</p>
        </div>
        {/*form*/}
        <div style={styles.loginForm}>
          <p
            style={{
              fontSize: hp(1.5),
              color: theme.colors.text,
            }}
          >
            Please fill the details to create an account
          </p>
          <Input
            icon={<Icon name="User" size={26} strokeWidth={1.6} />}
            placeholder="Enter your name"
            onChange={(value) => (userRef.current = value)}
          />
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
          <Input
            icon={<Icon name="Lock" size={26} strokeWidth={1.6} />}
            placeholder="Re-Enter your password"
            type="password"
            onChange={(value) => (passwordCheck.current = value)}
          />
          <p style={styles.forgotPassword}>Forgot Password?</p>
          {/*button*/}
          <Button
            title={"Sign up"}
            loading={loading}
            onPress={handleRegister}
          />
        </div>
        {/*footer*/}
        <div style={styles.loginFooter}>
          <p style={{ ...styles.loginFooterText, margin: 0 }}>
            Already have an account!&nbsp;
          </p>
          <span
            onClick={() => navigate("/")}
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
