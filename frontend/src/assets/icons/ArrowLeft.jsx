const ArrowLeft = ({ width = 24, height = 24, color = "#000", ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill="none"
      {...props}
    >
      <path
        d="M15 6C15 6 9.00001 10.4189 9 12C8.99999 13.5812 15 18 15 18"
        stroke={color}
        strokeWidth={props.strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
};

export default ArrowLeft;
