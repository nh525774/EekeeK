// src/components/BackButton.jsx

import React from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../assets/icons";
import Button from "./Button";
import { theme } from "../constants/theme";
import { styles } from "../constants/styles";

const BackButton = ({ size = 26 }) => {
  const navigate = useNavigate();

  return (
    <Button
      onPress={() => navigate(-1)} // ✅ 이전 페이지로 이동
      buttonStyle={styles.backButton}
    >
      <Icon
        name="ArrowLeft"
        strokeWidth={2.5}
        size={size}
        color={theme.colors.hotpink}
      />
    </Button>
  );
};

export default BackButton;
