import Loading from "./loading";
import { styles } from "../constants/styles";

const Button = ({
  buttonStyle = {},
  textStyle = {},
  title = "",
  onPress = () => {},
  loading = false,
  hasShadow = true,
  children,
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
      {title ? (
        <span style={{ ...styles.text, ...textStyle }}>{title}</span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
