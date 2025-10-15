// src/components/ScreenWrapper.jsx

import React from "react";

const ScreenWrapper = ({ children, bg = "white" }) => {
  const paddingTop = window.innerWidth <= 768 ? 30 : 50; // 모바일/PC 대응

  return (
    <div
      style={{
        minHeight: "100vh",
        paddingTop: `${paddingTop}px`,
        backgroundColor: bg,
      }}
    >
      {children}
    </div>
  );
};

export default ScreenWrapper;
