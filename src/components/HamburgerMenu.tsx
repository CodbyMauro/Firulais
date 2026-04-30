import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMenu } from "../context/MenuContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

// TODO: reemplazar por el link real de cobro de Mercado Pago
// Formato esperado: https://mpago.la/... o https://link.mercadopago.com.ar/...
const MP_DONATION_URL = "https://mpago.la/REPLACE_ME";

type MenuItem = {
  icon: string;
  label: string;
  path?: string;
  external?: string;
};

const menuItems: MenuItem[] = [
  { icon: "settings",            label: "Configuración",    path: "/settings" },
  { icon: "local_hospital",      label: "Centros de Ayuda", path: "/centros" },
  { icon: "help",                label: "Ayuda y Soporte",  path: "/help" },
  { icon: "celebration",         label: "Finales Felices",  path: "/finales" },
  { icon: "volunteer_activism",  label: "Donar",            external: MP_DONATION_URL },
];

export default function HamburgerMenu() {
  const { isOpen, closeMenu } = useMenu();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_premium, premium_until")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setIsPremium(
          data.is_premium || (data.premium_until && new Date(data.premium_until) > new Date()),
        );
      });
  }, [user]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeMenu(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, closeMenu]);

  // Bloquear scroll del body cuando el drawer está abierto
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleNav = (path: string) => { closeMenu(); navigate(path); };
  const handleLogout = async () => { closeMenu(); await logout(); navigate("/login"); };

  const handleItemClick = (item: MenuItem) => {
    if (item.external) {
      window.open(item.external, "_blank", "noopener,noreferrer");
      closeMenu();
      return;
    }
    if (item.path) {
      handleNav(item.path);
      return;
    }
    closeMenu();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={closeMenu}
      />

      {/* Drawer */}
      <div
        className={`lg:hidden fixed top-0 right-0 z-50 h-full w-72 max-w-[85vw] bg-white dark:bg-slate-800 shadow-2xl dark:shadow-slate-900/50 flex flex-col transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header del drawer */}
        <div className="flex items-center justify-between px-5 pt-12 pb-6 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#2b9dee]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px] text-[#2b9dee]">account_circle</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{user?.name ?? "Usuario"}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[140px]">{user?.email ?? ""}</p>
            </div>
          </div>
          <button onClick={closeMenu} className="flex size-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
            <span className="material-symbols-outlined text-[20px] text-slate-500 dark:text-slate-400">close</span>
          </button>
        </div>

        {/* Items */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">

          {/* Banner Premium — solo si no es premium */}
          {!isPremium && (
            <button
              onClick={() => handleNav("/premium")}
              className="flex items-center gap-3 px-4 py-3.5 mb-1 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-left w-full"
            >
              <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px] text-amber-500">star</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Hacete Premium</p>
                <p className="text-[11px] text-amber-600 dark:text-amber-500">IA ilimitada para encontrar tu mascota</p>
              </div>
              <span className="material-symbols-outlined text-[18px] text-amber-400 ml-auto">chevron_right</span>
            </button>
          )}

          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleItemClick(item)}
              className="flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left w-full"
            >
              <div className="w-9 h-9 bg-[#2b9dee]/10 dark:bg-[#2b9dee]/20 rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px] text-[#2b9dee]">{item.icon}</span>
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.label}</span>
              <span className="material-symbols-outlined text-[18px] text-slate-300 dark:text-slate-600 ml-auto">chevron_right</span>
            </button>
          ))}

        </nav>

        {/* Logout */}
        <div className="px-3 pb-10 pt-2 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left w-full"
          >
            <div className="w-9 h-9 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px] text-red-500">logout</span>
            </div>
            <span className="text-sm font-semibold text-red-500">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  );
}
