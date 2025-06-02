const Comment = ({ width = 24, height = 24, color = "#000", ...props }) => {
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
        d="M2 10.5C2 5.5 6 3 12 3C18 3 22 5.5 22 10.5C22 15.5 18 18 12 18V21C12 21 2 18 2 10.5Z"
        stroke={color}
        strokeWidth={props.strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M8 8.5H16M8 12.5H12"
        stroke={color}
        strokeWidth={props.strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
};

export default Comment;
