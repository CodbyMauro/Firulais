import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { checkIsAdmin } from "../../lib/adminService";

const NAV_ITEMS = [
  { path: "/admin", label: "Dashboard", icon: "dashboard" },
  { path: "/admin/adoptions", label: "Adopciones", icon: "favorite" },
  { path: "/admin/services", label: "Servicios", icon: "directions_walk" },
  { path: "/admin/store", label: "Tienda", icon: "storefront" },
  { path: "/admin/happy-endings", label: "Finales Felices", icon: "celebration" },
  { path: "/admin/help-centers", label: "Centros de Ayuda", icon: "local_hospital" },
];

export default function AdminLayout() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    checkIsAdmin(user.id).then((ok) => {
      setIsAdmin(ok);
      if (!ok) navigate("/home");
    });
  }, [user, authLoading, navigate]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <svg className="animate-spin h-8 w-8 text-[#2b9dee]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="flex h-screen bg-slate-100 font-display text-slate-900 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{ paddingTop: "var(--app-top-inset, env(safe-area-inset-top, 0px))" }}
        className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col bg-white border-r border-slate-200 transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-[#2b9dee] flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[18px]">pets</span>
          </div>
          <div>
            <p className="font-extrabold text-sm leading-tight">Firulais</p>
            <p className="text-[11px] text-slate-400 font-medium">Admin Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = item.path === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[#2b9dee]/10 text-[#2b9dee]"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Back to app */}
        <div className="px-3 pb-4">
          <Link
            to="/home"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Volver a la app
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-6 py-4 bg-white border-b border-slate-200 shrink-0">
          <button
            className="lg:hidden flex size-9 items-center justify-center rounded-xl bg-slate-100"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
          <h1 className="font-bold text-base">
            {NAV_ITEMS.find((n) =>
              n.path === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(n.path)
            )?.label ?? "Admin"}
          </h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
