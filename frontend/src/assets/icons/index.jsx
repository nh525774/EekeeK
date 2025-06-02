import { icons } from "./iconMap";

const Icon = ({
  name,
  size = 24,
  strokeWidth = 1.9,
  color = "#000",
  ...props
}) => {
  const Component = icons[name];
  if (!Component) return null;

  return (
    <Component
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      color={color}
      {...props}
    />
  );
};

export default Icon;
