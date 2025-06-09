// src/components/Header.jsx

import React from "react";
import BackButton from "./BackButton";
import { theme } from "../constants/theme";

const Header = ({ title = "", showBack = false, rightComponent = null }) => {
  return (
    <header style={styles.header}>
      {showBack ? <BackButton size={24} /> : <div style={styles.spacer} />}
      <h1 style={styles.title}>{title}</h1>
      {rightComponent || <div style={styles.spacer} />}
    </header>
  );
};

export default Header;

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px 20px",
    backgroundColor: theme.colors?.background || "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    height: "60px",
  },
  spacer: {
    width: "36px", // 버튼 넓이만큼 확보
  },
  title: {
    fontSize: "18px",
    textAlign: "center",
    flex: 1,
    fontWeight: "bold",
    color: theme.colors?.text || "#111",
  },
};
