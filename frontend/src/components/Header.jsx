import React from "react";
import BackButton from "./BackButton";
import { theme } from "../constants/theme";

const Header = ({ title = "", showBack = false, rightComponent = null }) => {
  return (
    <header
      style={styles.header}
      className="header-blur card-glass shadow-soft border-b border-border rounded-b-2xl px-5 py-3 flex items-center justify-between"
    >
      {showBack ? <BackButton size={24} /> : <div style={styles.spacer} />}
      <h1
        style={styles.title}
        className="text-lg sm:text-xl font-semibold tracking-tight text-foreground select-none"
      >
        {title}
      </h1>
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
    backgroundColor: "transparent", // ✅ 투명 글래스 톤
    backdropFilter: "blur(12px)", // ✅ 살짝 흐림 효과
    WebkitBackdropFilter: "blur(12px)",
    borderBottom: "1px solid hsl(var(--border))",
    height: "64px",
    position: "sticky",
    top: 0,
    zIndex: 40, // ✅ 상단 고정시 겹침 방지
  },
  spacer: {
    width: "36px", // BackButton 자리 확보
  },
  title: {
    fontSize: "18px",
    textAlign: "center",
    flex: 1,
    fontWeight: "bold",
    color: theme.colors?.text || "hsl(var(--foreground))",
  },
};
