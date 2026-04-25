import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { useMenu } from "../context/MenuContext";
import { usePets } from "../hooks/usePets";

const categories = [
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
      <div className="flex shrink-0 items-center bg-white dark:bg-slate-800 p-4 pb-2 justify-between sticky top-0 z-10 border-b border-slate-100 dark:border-slate-700">
        <button onClick={openMenu} className="lg:hidden flex size-12 shrink-0 items-center justify-start">
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
        <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Inicio</h2>
        <div className="flex w-12 items-center justify-end">
          <button
            className="flex cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 bg-transparent text-[#2b9dee] p-0"
            onClick={() => navigate("/profile")}
          >
            <span className="material-symbols-outlined text-3xl">account_circle</span>
          </button>
        </div>
      </div>

      <div className="shrink-0 px-4 py-3 bg-white dark:bg-slate-800">
        <div className="flex w-full items-stretch h-12 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <div className="text-slate-400 flex shrink-0 items-center justify-center pl-3 pr-1">
            <span className="material-symbols-outlined">search</span>
          </div>
          <input
            className="flex min-w-0 flex-1 bg-transparent h-full text-slate-900 dark:text-white focus:outline-none focus:ring-0 border-0 placeholder:text-slate-500 dark:placeholder:text-slate-400 pl-1 pr-3 text-base font-normal leading-normal"
            placeholder="Buscar por raza, color o ubicación"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="flex shrink-0 items-center justify-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label="Limpiar búsqueda"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex w-full shrink-0 overflow-x-auto px-4 py-3 bg-white dark:bg-slate-800 [&::-webkit-scrollbar]:hidden">
        <div className="flex min-h-min flex-row items-start justify-start gap-6">
          {categories.map((cat) => (
            <button
              key={cat.label}
              onClick={() => cat.path ? navigate(cat.path) : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-2 w-16 text-center"
            >
              <div className={`w-14 h-14 ${cat.bg} flex items-center justify-center rounded-full ${cat.color}`}>
                <span className="material-symbols-outlined">{cat.icon}</span>
              </div>
              <p className="text-slate-900 dark:text-white text-[13px] font-medium leading-normal">{cat.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col min-h-0 bg-[#f6f7f8] dark:bg-slate-900 pb-24 lg:pb-8">
        <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-5">
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em]">Reportes recientes</h2>
          <button onClick={() => navigate("/all-reports")} className="text-[#2b9dee] text-sm font-semibold">Ver todos</button>
        </div>

        {isLoading ? (
          <div className="flex flex-1 min-h-[12rem] items-center justify-center px-4">
            <svg className="animate-spin h-8 w-8 text-[#2b9dee]" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
        ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 px-4 lg:px-6">
          {filteredPets.length === 0 && (
            <div className="col-span-2 flex flex-col items-center py-12 text-slate-400 dark:text-slate-500 gap-3">
              <span className="material-symbols-outlined text-[48px]">pets</span>
              <p className="text-sm font-medium">No hay reportes aún</p>
            </div>
          )}
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
                <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide shadow ${
                  pet.status === "lost" ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"
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

      <button
        className="fixed bottom-24 lg:bottom-6 right-6 w-14 h-14 bg-[#2b9dee] text-white rounded-full shadow-lg flex items-center justify-center z-20"
        onClick={() => navigate("/report")}
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      <BottomNav />
    </div>
  );
}
