import React from 'react';
import { hp } from '../helpers/common';
import { theme } from "../constants/theme";

const Avatar = ({
    uri,
    size=hp(4.5),
    rounded=theme.radius.md,
    style={}
}) => {
    return (
        <img
      src={uri || "/default-profile.png"}
      alt="avatar"
      style={{
        height: size,
        width: size,
        borderRadius: rounded,
        objectFit: "cover",
        border: `1px solid ${theme.colors.darkLight}`,
        ...style,
      }}
    />
    );
};

export default Avatar