// src/assets/icons/index.js\

import Home from "./Home";
import Mail from "./Mail";
import Lock from "./Lock";
import User from "./User";
import Heart from "./Heart";
import Plus from "./Plus";
import Search from "./Search";
import Location from "./Location";
import Call from "./Call";
import Camera from "./Camera";
import Edit from "./Edit";
import ArrowLeft from "./ArrowLeft";
import threeDotsCircle from "./threeDotsCircle";
import threeDotsHorizontal from "./threeDotsHorizontal";
import Comment from "./Comment";
import Share from "./Share";
import Delete from "./Delete";
import logout from "./logout";
import Image from "./Image";

export const icons = {
  Home,
  Image,
  Mail,
  User,
  Heart,
  ArrowLeft,
  Call,
  Camera,
  Comment,
  Delete,
  Edit,
  Location,
  Lock,
  logout,
  Plus,
  Search,

  Share,
  threeDotsCircle,
  threeDotsHorizontal,
};
// ✅ 이 줄 추가!
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
