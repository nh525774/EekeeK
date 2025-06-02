import { theme } from "../constants/theme";
import { hp } from "../helpers/common"; // 웹 환경에서도 이게 작동한다면 유지, 아니라면 px로 치환
import Loading from "./loading";

const Button = ({
  buttonStyle = {},
  textStyle = {},
  title = "",
  onPress = () => {},
  loading = false,
  hasShadow = true,
}) => {
  const shadowStyle = hasShadow
    ? {
        boxShadow: "0px 10px 8px rgba(0, 0, 0, 0.2)",
      }
    : {};

  if (loading) {
    return (
      <div
        style={{
          ...styles.button,
          ...buttonStyle,
          backgroundColor: "white",
        }}
      >
        <Loading size="small" />
      </div>
    );
  }

  return (
    <button
      onClick={onPress}
      style={{
        ...styles.button,
        ...buttonStyle,
        ...shadowStyle,
      }}
    >
      <span style={{ ...styles.text, ...textStyle }}>{title}</span>
    </button>
  );
};

export default Button;

const styles = {
  button: {
    backgroundColor: theme.colors.primary,
    height: hp ? hp(6.6) : "50px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: theme.radius?.xl || "12px",
    border: "none",
    cursor: "pointer",
  },
  text: {
    fontSize: hp ? hp(2.5) : "16px",
    color: "white",
    fontWeight: theme.fonts?.bold || "bold",
  },
};
