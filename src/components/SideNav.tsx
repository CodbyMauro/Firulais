import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { chatOpenedFromMessagesList } from "../lib/chatNavigation";

const navItems = [
  { path: "/home",    icon: "home",         label: "Inicio"    },
  { path: "/map",     icon: "map",          label: "Mapa"      },
  { path: "/chat",    icon: "chat_bubble",  label: "Mensajes"  },
  { path: "/profile", icon: "person",       label: "Perfil"    },
];

const AUTH_PATHS = ["/splash", "/login", "/register", "/auth/callback"];

export default function SideNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  if (AUTH_PATHS.includes(location.pathname)) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 sticky top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-100 dark:border-slate-700">
        <span
          className="material-symbols-outlined text-[28px] text-[#2b9dee]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          pets
        </span>
        <span className="text-xl font-bold text-slate-900 dark:text-white">Firulais</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => {
                if (item.path === "/chat" && location.pathname.startsWith("/chat/")) {
                  if (chatOpenedFromMessagesList(location.state)) navigate(-1);
                  else navigate("/chat", { replace: true });
                  return;
                }
                if (item.path === "/chat" && location.pathname === "/home") {
                  navigate("/chat", { replace: true });
                  return;
                }
                const fromNested = location.pathname.startsWith(`${item.path}/`);
                navigate(item.path, fromNested ? { replace: true } : undefined);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left w-full ${
                isActive
                  ? "bg-[#2b9dee]/10 dark:bg-[#2b9dee]/20 text-[#2b9dee]"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              }`}
            >
              <span
                className="material-symbols-outlined text-[24px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span className={`text-sm font-semibold ${isActive ? "text-[#2b9dee]" : ""}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-1">
        {/* dark mode toggle temporarily disabled */}
        {/* <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors w-full text-left"
        >
          <span className="material-symbols-outlined text-[22px] text-slate-500 dark:text-slate-400">
            {theme === "dark" ? "dark_mode" : "light_mode"}
          </span>
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            {theme === "dark" ? "Modo oscuro" : "Modo claro"}
          </span>
        </button> */}

        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors w-full text-left"
        >
          <span className="material-symbols-outlined text-[22px] text-slate-500 dark:text-slate-400">settings</span>
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Configuración</span>
        </button>

        {/* User card */}
        <div className="flex items-center gap-3 px-4 py-3 mt-1 rounded-xl bg-slate-50 dark:bg-slate-700/50">
          <div className="w-8 h-8 rounded-full bg-[#2b9dee]/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px] text-[#2b9dee]">account_circle</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name ?? "Usuario"}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user?.email ?? ""}</p>
          </div>
          <button onClick={handleLogout} title="Cerrar sesión" className="shrink-0">
            <span className="material-symbols-outlined text-[18px] text-slate-400 hover:text-red-500 transition-colors">
              logout
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
