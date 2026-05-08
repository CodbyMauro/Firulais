import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchConversations, fetchUnreadCounts } from "../lib/chatService";
import { chatOpenedFromMessagesList } from "../lib/chatNavigation";

const navItems = [
  { path: "/home", icon: "home", label: "Inicio" },
  { path: "/map", icon: "map", label: "Mapa" },
  { path: "/chat", icon: "chat_bubble", label: "Mensajes" },
  { path: "/profile", icon: "person", label: "Perfil" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchConversations(user.id).then(async (list) => {
      const counts = await fetchUnreadCounts(user.id, list.map((c) => c.id));
      const total = Object.values(counts).filter((n) => n > 0).length;
      setTotalUnread(total);
    });
  }, [user, location.pathname]);

  return (
    <div className="firulais-bottom-nav lg:hidden fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 pt-2 z-30" style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}>
      <div className="flex gap-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const showBadge = item.path === "/chat" && totalUnread > 0 && !isActive;
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
              className={`flex flex-1 flex-col items-center justify-center gap-1 ${isActive ? "text-[#2b9dee]" : "text-slate-500 dark:text-slate-400"}`}
            >
              <div className="relative flex h-8 items-center justify-center">
                <span
                  className="material-symbols-outlined text-[28px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                {showBadge && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </div>
              <p className={`text-xs leading-normal tracking-[0.015em] ${isActive ? "font-bold" : "font-medium"}`}>
                {item.label}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
