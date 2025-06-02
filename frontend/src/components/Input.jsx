// src/components/Input.jsx

import React from "react";
import { styles } from "../constants/styles";

const Input = (props) => {
  return (
    <div style={{ ...styles.inputContainer, ...props.containerStyles }}>
      {props.icon && props.icon}
      <input
        style={{ flex: 1, border: "none", outline: "none", fontSize: "16px" }}
        placeholder={props.placeholder}
        ref={props.inputRef}
        {...props}
      />
    </div>
  );
};

export default Input;
