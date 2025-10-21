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
    <aside
      className="
        flex flex-col items-center justify-between
        h-full py-8 px-2 sm:px-4
        bg-gradient-to-b from-background/80 via-muted/30 to-background/70
        border-r border-border
        shadow-soft backdrop-blur-lg
      "
    >
      {/* 로고 */}
      <Link
        to="/MainPage"
        className="group flex flex-col items-center gap-2 mb-10"
      >
        <img
          src="/icons/logo.webp"
          alt="logo"
          className="w-8 h-8 group-hover:scale-105 transition-transform duration-300"
        />
        <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground">
          EekeeK
        </span>
      </Link>

      {/* 네비게이션 아이콘 목록 */}
      <nav className="flex flex-col items-center justify-between gap-6">
        {icons.map((icon) => {
          const active = currentPath === icon.to;
          return (
            <Link
              key={icon.to}
              to={icon.to}
              className={`
                group relative flex items-center justify-center
                w-12 h-12 rounded-xl transition-all duration-300
                ${
                  active
                    ? "bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-[0_0_8px_rgba(0,0,0,0.15)]"
                    : "hover:bg-muted/30"
                }
              `}
            >
              <img
                src={icon.src}
                alt={icon.alt}
                className={`w-6 h-6 transition-transform duration-200 ${
                  active
                    ? "opacity-100 scale-110"
                    : "opacity-60 group-hover:opacity-100"
                }`}
              />
              {active && (
                <span className="absolute left-0 w-[3px] h-5 rounded-r bg-primary"></span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 하단 여백용 공간 */}
      <div className="h-10"></div>
    </aside>
  );
}
