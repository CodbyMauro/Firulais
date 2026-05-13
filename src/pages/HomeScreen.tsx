import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { useMenu } from "../context/MenuContext";
import { useNotifications } from "../context/NotificationsContext";
import { usePets } from "../hooks/usePets";
import { foldAccentsContains } from "../lib/foldAccents";

const CATEGORIES = [
  { icon: "near_me", label: "Cerca", bg: "bg-[#2b9dee]/10", color: "text-[#2b9dee]", path: "/map" },
  { icon: "notifications_active", label: "Alertas", bg: "bg-amber-100 dark:bg-amber-900/30", color: "text-amber-600", path: "/notifications" },
  { icon: "favorite", label: "Adopciones", bg: "bg-pink-100 dark:bg-pink-900/30", color: "text-pink-600", path: "/adoptions" },
  { icon: "storefront", label: "Tienda", bg: "bg-emerald-100 dark:bg-emerald-900/30", color: "text-emerald-600", path: "/store" },
  { icon: "directions_walk", label: "Servicios", bg: "bg-slate-100 dark:bg-slate-700", color: "text-slate-600 dark:text-slate-300", path: "/services" },
];

export default function HomeScreen() {
  const navigate = useNavigate();
  const { openMenu } = useMenu();
  const { unreadCount } = useNotifications();
  const { pets, isLoading } = usePets();
  const [search, setSearch] = useState("");

  const filteredPets = search.trim()
    ? pets.filter((p) => {
      const q = search.trim();
      return (
        foldAccentsContains(p.name, q) ||
        foldAccentsContains(p.breed, q) ||
        foldAccentsContains(p.color, q) ||
        foldAccentsContains(p.location, q)
      );
    })
    : pets;

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return "ahora";
    if (diff < 60) return `${diff}m`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return `${Math.floor(diff / 1440)}d`;
  };

  return (
    <div className="firulais-home-route relative mx-auto flex w-full min-w-0 max-w-[430px] flex-col overflow-hidden bg-white font-display text-slate-900 shadow-2xl dark:bg-slate-800 dark:text-white dark:shadow-slate-900/50 lg:max-w-none lg:shadow-none">

      {/* Header (no sticky: el scroll es solo del feed; así no sube bajo la status bar ni “salta”) */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <button onClick={openMenu} className="lg:hidden flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
          <span className="material-symbols-outlined text-[22px] text-slate-600 dark:text-slate-300">menu</span>
        </button>
        <h2 className="text-[17px] font-extrabold tracking-tight flex-1 text-center">Inicio</h2>
        <button
          type="button"
          className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700"
          onClick={() => navigate("/notifications")}
          aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : "Notificaciones"}
        >
          <span
            className={`material-symbols-outlined text-[22px] ${unreadCount > 0 ? "text-[#2b9dee]" : "text-slate-600 dark:text-slate-300"}`}
            style={{ fontVariationSettings: unreadCount > 0 ? "'FILL' 1" : undefined }}
          >
            notifications
          </span>
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Search bar */}
      <div className="shrink-0 px-4 py-3 bg-white dark:bg-slate-800">
        <div className="flex w-full items-center h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 gap-3 px-4">
          <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
          <input
            className="flex-1 bg-transparent text-slate-900 dark:text-white focus:outline-none text-[14px] placeholder:text-slate-400 dark:placeholder:text-slate-500"
            placeholder="Buscar por raza, color o zona…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="flex shrink-0 items-center justify-center text-slate-400"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="shrink-0 bg-white dark:bg-slate-800 pb-4">
        <div className="flex gap-4 px-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => cat.path ? navigate(cat.path) : undefined}
              className="flex flex-col items-center gap-2 shrink-0"
            >
              <div className={`w-14 h-14 ${cat.bg} rounded-2xl flex items-center justify-center ${cat.color}`}>
                <span
                  className="material-symbols-outlined text-[26px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {cat.icon}
                </span>
              </div>
              <p className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">{cat.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-2.5 bg-slate-100 dark:bg-slate-900 w-full shrink-0" />

      {/* Feed: única zona con scroll vertical (evita scroll en #root que recortaba header y final) */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain bg-[#f6f7f8] pb-mobile-tab dark:bg-slate-900 lg:pb-8">
        <div className="flex min-w-0 shrink-0 items-center justify-between gap-2 px-4 pb-3 pt-3">
          <div className="min-w-0">
            <h2 className="text-[18px] font-extrabold tracking-tight text-slate-900 dark:text-white">Reportes recientes</h2>
            {!isLoading && (
              <p className="text-[11.5px] text-slate-400 mt-0.5">En tu zona · {filteredPets.length} activos</p>
            )}
          </div>
          <button
            onClick={() => navigate("/all-reports")}
            className="flex shrink-0 items-center gap-1 text-[12.5px] font-bold text-[#2b9dee]"
          >
            Ver todos
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-1 min-h-[12rem] items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-[#2b9dee]" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : filteredPets.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-slate-400 dark:text-slate-500 gap-3">
            <span className="material-symbols-outlined text-[48px]">pets</span>
            <p className="text-sm font-medium">No hay reportes aún</p>
          </div>
        ) : (
          <div className="grid min-w-0 grid-cols-2 gap-3 px-4 lg:grid-cols-3 xl:grid-cols-4">
            {filteredPets.slice(0, 10).map((pet) => (
              <div
                key={pet.id}
                onClick={() => navigate(`/pet/${pet.id}`)}
                className="min-w-0 cursor-pointer overflow-hidden rounded-2xl border border-slate-100 bg-white transition-transform duration-150 hover:shadow-lg active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="relative w-full aspect-square bg-slate-100 dark:bg-slate-700">
                  {pet.image_url
                    ? <img src={pet.image_url} alt={pet.name ?? ""} className="w-full h-full object-cover" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-[42px] text-slate-300 dark:text-slate-600">pets</span>
                    </div>
                  }
                  <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide shadow ${pet.status === "lost" ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"
                    }`}>
                    {pet.status === "lost" ? "Perdido" : "Hallado"}
                  </div>
                  <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {timeAgo(pet.created_at)}
                  </div>
                </div>
                <div className="p-2.5">
                  <h3 className="text-[13px] font-extrabold leading-tight truncate dark:text-white">
                    {pet.status === "lost" ? (pet.name ?? "Sin nombre") : (pet.breed ?? "Mascota")}
                  </h3>
                  <div className="flex items-center gap-0.5 mt-1">
                    <span className="material-symbols-outlined text-[#2b9dee] shrink-0" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>location_on</span>
                    <span className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">{pet.location}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        className="firulais-floating-action fixed max-lg:bottom-[var(--firulais-mobile-tab-clearance)] max-lg:z-[45] lg:bottom-6 lg:z-20 right-6 w-14 h-14 text-white rounded-full shadow-xl flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #2b9dee, rgba(43,157,238,0.75))", boxShadow: "0 8px 24px rgba(43,157,238,0.45)" }}
        onClick={() => navigate("/report")}
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      <BottomNav />
    </div>
  );
}
