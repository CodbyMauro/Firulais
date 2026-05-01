import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { useMenu } from "../context/MenuContext";
import { usePets } from "../hooks/usePets";

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
  const { pets, isLoading } = usePets();
  const [search, setSearch] = useState("");

  const filteredPets = search.trim()
    ? pets.filter((p) => {
      const q = search.toLowerCase();
      return (
        p.breed?.toLowerCase().includes(q) ||
        p.color?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q)
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
    <div className="relative flex min-h-[100dvh] w-full max-w-[430px] lg:max-w-none mx-auto flex-col bg-white dark:bg-slate-800 font-display text-slate-900 dark:text-white shadow-2xl lg:shadow-none dark:shadow-slate-900/50 overflow-x-hidden">

      {/* Header */}
      <div className="flex shrink-0 items-center bg-white dark:bg-slate-800 px-4 py-3 justify-between sticky top-0 z-10 border-b border-slate-100 dark:border-slate-700">
        <button onClick={openMenu} className="lg:hidden flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
          <span className="material-symbols-outlined text-[22px] text-slate-600 dark:text-slate-300">menu</span>
        </button>
        <h2 className="text-[17px] font-extrabold tracking-tight flex-1 text-center">Inicio</h2>
        <button
          className="flex size-10 items-center justify-center rounded-xl overflow-hidden text-[#2b9dee]"
          onClick={() => navigate("/profile")}
        >
          <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
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

      {/* Feed */}
      <div className="flex flex-1 flex-col min-h-0 bg-[#f6f7f8] dark:bg-slate-900 pb-24 lg:pb-8">
        <div className="flex shrink-0 items-center justify-between px-4 pt-3 pb-3">
          <div>
            <h2 className="text-[18px] font-extrabold tracking-tight text-slate-900 dark:text-white">Reportes recientes</h2>
            {!isLoading && (
              <p className="text-[11.5px] text-slate-400 mt-0.5">En tu zona · {filteredPets.length} activos</p>
            )}
          </div>
          <button
            onClick={() => navigate("/all-reports")}
            className="flex items-center gap-1 text-[12.5px] font-bold text-[#2b9dee]"
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
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 px-4">
            {filteredPets.slice(0, 10).map((pet) => (
              <div
                key={pet.id}
                onClick={() => navigate(`/pet/${pet.id}`)}
                className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 cursor-pointer active:scale-[0.98] transition-transform duration-150 hover:shadow-lg"
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
        className="fixed bottom-24 lg:bottom-6 right-6 w-14 h-14 text-white rounded-full shadow-xl flex items-center justify-center z-20"
        style={{ background: "linear-gradient(135deg, #2b9dee, rgba(43,157,238,0.75))", boxShadow: "0 8px 24px rgba(43,157,238,0.45)" }}
        onClick={() => navigate("/report")}
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      <BottomNav />
    </div>
  );
}
