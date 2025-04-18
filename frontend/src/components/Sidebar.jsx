import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const icons = [
    { to: "/MainPage", src: "/icons/home.svg", alt: "home" },
    { to: "/SearchPage", src: "/icons/search.svg", alt: "search" },
    { to: "/UploadPage", src: "/icons/plus.svg", alt: "upload" },
    { to: "/notifications", src: "/icons/bell.svg", alt: "notifications" },
    { to: "/ProfilePage", src: "/icons/user.svg", alt: "profile" },
    { to: "/settings", src: "/icons/settings.svg", alt: "settings" },
  ];

  return (
    <div
      className="
        flex flex-col items-center py-8  py-6 pl-4 h-full
      "
    >
      <Link to="/MainPage" >
        <img src="/icons/logo.webp" alt="logo" className="w-8 h-8 mb-10" />
      </Link>

    <div className="h-full flex flex-col justify-between gap-6 items-center py-6"> 
      {icons.map((icon) => (
        <Link key={icon.to} to={icon.to}>
          <img
            src={icon.src}
            alt={icon.alt}
            className={`w-6 h-6 p-2 pl-5 ${
              currentPath === icon.to ? "opacity-100" : "opacity-50"
            } hover:opacity-100 transition duration-200`}
          />
        </Link>
      ))}
    </div>
    
    </div>
  );
}
