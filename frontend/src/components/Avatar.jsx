import React from "react";
import { hp } from "../helpers/common";
import { theme } from "../constants/theme";
import { getUserImageSrc } from "../services/imageService";

const Avatar = ({ uri, size = hp(4.5), style = {} }) => {
  return (
    <img
      src={getUserImageSrc(uri) || "/defaultUser.png"}
      alt="avatar"
      style={{
        height: size,
        width: size,
        border: `1px solid ${theme.colors.darkLight || "#ccc"}`, // borderColor + borderWidth 대체
        borderRadius: "50%", // 둥글게 하고 싶으면 px 조절 (ex: '50%'면 완전 원형)
        objectFit: "cover", // 이미지가 찌그러지지 않게
        ...style,
      }}
    />
  );
};

export default Avatar;
