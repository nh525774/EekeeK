import { theme } from "../constants/theme";

const Loading = ({ size = "large", color = theme.colors.primary }) => {
  const loaderSize = size === "large" ? "50px" : "25px";

  return (
    <div style={styles.container}>
      <div
        style={{
          width: loaderSize,
          height: loaderSize,
          border: `4px solid ${color}`,
          borderTop: "4px solid transparent",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      ></div>
    </div>
  );
};

export default Loading;

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
  },
};
