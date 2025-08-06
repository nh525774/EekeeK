// src/components/Input.jsx

import React from "react";
import { styles } from "../constants/styles";

const Input = (props) => {
  return (
    <div style={{ ...styles.inputContainer, ...props.containerStyle && props.containerStyles }}>
      {props.icon && props.icon}
      <input
        style={{ flex: 1, border: "none", outline: "none", fontSize: "16px" }}
        placeholder={props.placeholder}
        ref={props.inputRef}
        onChange={(e) => props.onChange?.(e.target.value)} // ✅ 여기가 핵심
        type={props.type || "text"}
      />
    </div>
  );
};

export default Input;
