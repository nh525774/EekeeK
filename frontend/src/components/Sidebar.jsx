import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const icons = [
    { to: "/", src: "/icons/home.svg", alt: "home" },
    { to: "/search", src: "/icons/search.svg", alt: "search" },
    { to: "/upload", src: "/icons/plus.svg", alt: "upload" },
    { to: "/notifications", src: "/icons/bell.svg", alt: "notifications" },
    { to: "/profile", src: "/icons/user.svg", alt: "profile" },
    { to: "/settings", src: "/icons/settings.svg", alt: "settings" },
  ];

  return (
    <div
      className="
        fixed z-10 bg-white border-r sm:border-t
        flex flex-col sm:flex-row
        w-20 h-full sm:w-full sm:h-16
        sm:bottom-0 bottom-auto md:left-0
        items-start justify-around md:justify-start md:space-y-6 md:py-4 ml-5
      "
    >
      {/* 앱 로고 (PC에서만 보이게) */}
      <Link to="/" className="hidden md:block">
        <img src="/icons/logo.webp" alt="logo" className="w-8 h-8" />
      </Link>

      {icons.map((icon) => (
        <Link key={icon.to} to={icon.to}>
          <img
            src={icon.src}
            alt={icon.alt}
            className={`w-6 h-6 p-2 ${
              currentPath === icon.to ? "opacity-100" : "opacity-50"
            } hover:opacity-100 transition duration-200`}
          />
        </Link>
      ))}
    </div>
  );
}
