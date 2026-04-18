import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchPetsPage, type Pet, type FetchPetsOptions } from "../lib/petsService";
import { fetchProfilesByIds, type Profile } from "../lib/profileService";
import UserAvatar from "../components/UserAvatar";

const timeAgo = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "ahora";
  if (diff < 60) return `${diff}m`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return `${Math.floor(diff / 1440)}d`;
};

const STATUS_TABS = [
  { value: "",      label: "Todos",        icon: "apps"         },
  { value: "lost",  label: "Perdidos",     icon: "search"       },
  { value: "found", label: "Encontrados",  icon: "check_circle" },
] as const;

function SkeletonRow() {
  return (
    <div className="flex gap-3 bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-100 dark:border-slate-700">
      <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse shrink-0" />
      <div className="flex-1 flex flex-col gap-2 justify-center">
        <div className="h-3.5 w-1/2 bg-slate-100 dark:bg-slate-700 rounded-full animate-pulse" />
        <div className="h-3 w-3/4 bg-slate-100 dark:bg-slate-700 rounded-full animate-pulse" />
        <div className="h-3 w-1/3 bg-slate-100 dark:bg-slate-700 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

// Chip de filtro activo con X para removerlo
function ActiveFilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1 bg-[#2b9dee]/10 dark:bg-[#2b9dee]/20 text-[#2b9dee] px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
      {label}
      <button onClick={onRemove} className="cursor-pointer ml-0.5">
        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
      </button>
    </div>
  );
}

const SPECIES_LABEL: Record<string, string> = { dog: "Perros", cat: "Gatos", other: "Otros" };

export default function AllReportsScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Leer filtros desde URL
  const statusParam  = searchParams.get("status")   ?? "";
  const speciesParam = searchParams.get("species")  ?? "";
  const colorParam   = searchParams.get("color")    ?? "";
  const dateFrom     = searchParams.get("dateFrom") ?? "";
  const dateTo       = searchParams.get("dateTo")   ?? "";

  const [search,      setSearch]      = useState("");
  const [pets,        setPets]        = useState<Pet[]>([]);
  const [page,        setPage]        = useState(0);
  const [hasMore,     setHasMore]     = useState(true);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reporterProfiles, setReporterProfiles] = useState<Record<string, Profile>>({});

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  useEffect(() => {
    setPets([]);
    setPage(0);
    setHasMore(true);
    load(0, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusParam, speciesParam, colorParam, dateFrom, dateTo, debouncedSearch]);

  const load = async (pageNum: number, reset = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      // Calcular days desde dateFrom si existe
      let days: FetchPetsOptions["days"] = undefined;
      if (dateFrom) {
        const diffMs  = Date.now() - new Date(dateFrom).getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if      (diffDays <= 1)  days = 1;
        else if (diffDays <= 3)  days = 3;
        else if (diffDays <= 7)  days = 7;
        else                     days = 30;
      }

      // Combinar color y búsqueda manual
      const combinedSearch = [colorParam, debouncedSearch].filter(Boolean).join(" ");

      const opts: FetchPetsOptions = {
        page:    pageNum,
        status:  statusParam  ? (statusParam  as "lost" | "found") : undefined,
        species: speciesParam === "dog" ? "dog" : speciesParam === "cat" ? "cat" : undefined,
        days,
        search:  combinedSearch,
      };

      const { pets: newPets, hasMore: more } = await fetchPetsPage(opts);
      setPets(prev => reset ? newPets : [...prev, ...newPets]);
      setHasMore(more);

      const ids = [...new Set(newPets.map(p => p.reporter_id).filter(Boolean))] as string[];
      if (ids.length) {
        fetchProfilesByIds(ids).then(profiles =>
          setReporterProfiles(prev => ({ ...prev, ...profiles }))
        );
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => { const next = page + 1; setPage(next); load(next); };

  const removeParam = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const setStatusParam = (val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set("status", val); else next.delete("status");
    setSearchParams(next, { replace: true });
  };

  // Chips activos de filtros externos
  const activeFilterChips = [
    speciesParam && { key: "species",  label: SPECIES_LABEL[speciesParam] ?? speciesParam },
    colorParam   && { key: "color",    label: colorParam },
    dateFrom     && { key: "dateFrom", label: `Desde ${dateFrom}` },
    dateTo       && { key: "dateTo",   label: `Hasta ${dateTo}` },
  ].filter(Boolean) as { key: string; label: string }[];

  const totalActiveFilters = activeFilterChips.length + (statusParam ? 1 : 0);

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] lg:max-w-2xl mx-auto bg-[#f6f7f8] dark:bg-[#101a22] font-display text-slate-900 dark:text-slate-100 pb-8">

      {/* Header sticky */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">

        {/* Búsqueda */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="flex size-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>

          <div className="flex flex-1 items-center bg-slate-100 dark:bg-slate-700 rounded-xl h-9 px-3 gap-2">
            <span className="material-symbols-outlined text-[18px] text-slate-400">search</span>
            <input
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              placeholder="Raza, color, nombre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="cursor-pointer">
                <span className="material-symbols-outlined text-[16px] text-slate-400">close</span>
              </button>
            )}
          </div>

          {/* Botón filtros */}
          <button
            onClick={() => navigate(`/filters?${searchParams.toString()}`)}
            className={`relative flex size-9 items-center justify-center rounded-xl shrink-0 cursor-pointer transition-colors ${
              totalActiveFilters > 0
                ? "bg-[#2b9dee]/10 dark:bg-[#2b9dee]/20"
                : "bg-slate-100 dark:bg-slate-700"
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${totalActiveFilters > 0 ? "text-[#2b9dee]" : ""}`}>
              tune
            </span>
            {totalActiveFilters > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#2b9dee] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {totalActiveFilters}
              </span>
            )}
          </button>
        </div>

        {/* Tabs de estado */}
        <div className="flex px-4 gap-1 pb-2">
          {STATUS_TABS.map(tab => {
            const isActive = statusParam === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusParam(tab.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#2b9dee] text-white shadow-sm shadow-[#2b9dee]/25"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 14, fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Chips de filtros activos desde FiltersScreen */}
        {activeFilterChips.length > 0 && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {activeFilterChips.map(chip => (
              <ActiveFilterChip
                key={chip.key}
                label={chip.label}
                onRemove={() => removeParam(chip.key)}
              />
            ))}
            <button
              type="button"
              onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
              className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap cursor-pointer px-1"
            >
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {/* Contador */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          {loading
            ? "Buscando..."
            : `${pets.length}${hasMore ? "+" : ""} reporte${pets.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-2.5 px-4 pt-1">

        {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

        {!loading && pets.length === 0 && (
          <div className="flex flex-col items-center py-24 gap-4">
            <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center border border-slate-100 dark:border-slate-700">
              <span className="material-symbols-outlined text-[36px] text-slate-300 dark:text-slate-600">pets</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Sin resultados</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Probá con otros filtros</p>
            </div>
          </div>
        )}

        {!loading && pets.map(pet => (
          <div
            key={pet.id}
            onClick={() => navigate(`/pet/${pet.id}`)}
            className="flex gap-3 bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-100 dark:border-slate-700 cursor-pointer active:scale-[0.99] transition-transform duration-150"
          >
            {/* Thumbnail */}
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0">
              {pet.image_url
                ? <img src={pet.image_url} alt={pet.name ?? ""} className="w-full h-full object-cover" loading="lazy" />
                : <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-slate-600">pets</span>
                  </div>
              }
              <div className={`absolute bottom-0 inset-x-0 flex justify-center py-1 text-[9px] font-bold uppercase tracking-wide ${
                pet.status === "lost" ? "bg-red-500 text-white" : "bg-emerald-500 text-white"
              }`}>
                {pet.status === "lost" ? "Perdido" : "Encontrado"}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div>
                <div className="flex items-start justify-between gap-1">
                  <h3 className="text-sm font-bold leading-snug truncate">
                    {pet.status === "lost" ? (pet.name ?? "Sin nombre") : (pet.breed ?? "Sin raza")}
                  </h3>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
                    {timeAgo(pet.created_at)}
                  </span>
                </div>
                {pet.breed && pet.status === "lost" && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{pet.breed}</p>
                )}
              </div>
              <div className="flex flex-col gap-1 mt-1.5">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[#2b9dee] shrink-0" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>
                    location_on
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{pet.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <UserAvatar
                    name={pet.reporter_name ?? "Anónimo"}
                    avatarData={pet.reporter_id ? reporterProfiles[pet.reporter_id]?.avatar_data : null}
                    avatarUrl={pet.reporter_id ? reporterProfiles[pet.reporter_id]?.avatar_url : null}
                    size={14}
                  />
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                    {pet.reporter_name ?? "Anónimo"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load more */}
      {!loading && hasMore && (
        <div className="px-4 mt-4">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full h-12 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
          >
            {loadingMore
              ? <svg className="animate-spin h-4 w-4 text-[#2b9dee]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              : <span className="material-symbols-outlined text-[18px]">expand_more</span>
            }
            {loadingMore ? "Cargando..." : "Ver más"}
          </button>
        </div>
      )}

      {!loading && !hasMore && pets.length > 0 && (
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6 pb-2">
          — Eso es todo —
        </p>
      )}
    </div>
  );
}
