import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { fetchPets, matchUrlSpeciesFilter, PET_SIZES, PUBLIC_PET_PAGE_SIZE, type Pet } from "../lib/petsService";
import { fetchProfilesByIds, type Profile } from "../lib/profileService";
import { foldAccentsContains } from "../lib/foldAccents";
import { supabase } from "../lib/supabase";
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
    <div className="flex gap-3 bg-white rounded-2xl p-3 border border-slate-100">
      <div className="w-[92px] h-[92px] rounded-xl bg-slate-100 animate-pulse shrink-0" />
      <div className="flex-1 flex flex-col gap-2 justify-center">
        <div className="h-3.5 w-1/2 bg-slate-100 rounded-full animate-pulse" />
        <div className="h-3 w-3/4 bg-slate-100 rounded-full animate-pulse" />
        <div className="h-3 w-1/3 bg-slate-100 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

function ActiveFilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1 bg-[#2b9dee]/10 text-[#2b9dee] px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
      {label}
      <button onClick={onRemove} className="cursor-pointer ml-0.5">
        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
      </button>
    </div>
  );
}

const SPECIES_LABEL: Record<string, string> = { dog: "Perros", cat: "Gatos", other: "Otros" };

function petWithinReportDateRange(pet: Pet, dateFrom: string, dateTo: string): boolean {
  const t = new Date(pet.created_at).getTime();
  if (dateFrom) {
    const start = new Date(`${dateFrom}T00:00:00`).getTime();
    if (t < start) return false;
  }
  if (dateTo) {
    const end = new Date(`${dateTo}T23:59:59.999`).getTime();
    if (t > end) return false;
  }
  return true;
}

/** Igual que HomeScreen: nombre, raza, color y ubicación (insensible a tildes). */
function matchesHomeSearchText(pet: Pet, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  return (
    foldAccentsContains(pet.name, q) ||
    foldAccentsContains(pet.breed, q) ||
    foldAccentsContains(pet.color, q) ||
    foldAccentsContains(pet.size, q) ||
    foldAccentsContains(pet.location, q)
  );
}

const PET_SIZE_SET = new Set<string>(PET_SIZES);

function petMatchesAllReportsFilters(
  pet: Pet,
  ctx: {
    statusParam: string;
    speciesParam: string;
    colorParam: string;
    sizeParams: string[];
    dateFrom: string;
    dateTo: string;
    debouncedSearch: string;
  },
): boolean {
  const { statusParam, speciesParam, colorParam, sizeParams, dateFrom, dateTo, debouncedSearch } = ctx;
  if (statusParam && pet.status !== statusParam) return false;
  const sp: "" | "dog" | "cat" = speciesParam === "dog" ? "dog" : speciesParam === "cat" ? "cat" : "";
  if (!matchUrlSpeciesFilter(pet, sp)) return false;
  if (colorParam.trim() && !foldAccentsContains(pet.color, colorParam.trim())) return false;
  if (sizeParams.length) {
    const ps = pet.size?.trim() ?? "";
    if (!ps || !sizeParams.includes(ps)) return false;
  }
  if (!petWithinReportDateRange(pet, dateFrom, dateTo)) return false;
  if (!matchesHomeSearchText(pet, debouncedSearch)) return false;
  return true;
}

export default function AllReportsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam  = searchParams.get("status")   ?? "";
  const speciesParam = searchParams.get("species")  ?? "";
  const colorParam   = searchParams.get("color")    ?? "";
  const dateFrom     = searchParams.get("dateFrom") ?? "";
  const dateTo       = searchParams.get("dateTo")   ?? "";
  /** Estable por URL: si se recrea cada render, `filterCtx` cambia siempre y el efecto que resetea `visibleCount` rompe "Ver más". */
  const sizeParams = useMemo(() => {
    return [...searchParams.getAll("size")].filter(s => PET_SIZE_SET.has(s));
  }, [searchParams.toString()]);

  const [search,      setSearch]      = useState("");
  const [cache,       setCache]       = useState<Pet[] | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [visibleCount, setVisibleCount] = useState(PUBLIC_PET_PAGE_SIZE);
  const [reporterProfiles, setReporterProfiles] = useState<Record<string, Profile>>({});
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPets()
      .then(data => {
        if (!cancelled) setCache(data);
      })
      .catch(() => {
        if (!cancelled) setCache([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const ch = supabase
      .channel("all-reports-pets-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "pets" }, () => {
        fetchPets().then(setCache).catch(() => {});
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, []);

  const filterCtx = useMemo(
    () => ({
      statusParam,
      speciesParam,
      colorParam,
      sizeParams,
      dateFrom,
      dateTo,
      debouncedSearch,
    }),
    [statusParam, speciesParam, colorParam, sizeParams, dateFrom, dateTo, debouncedSearch],
  );

  const filtered = useMemo(() => {
    if (!cache) return [];
    return cache.filter(p => petMatchesAllReportsFilters(p, filterCtx));
  }, [cache, filterCtx]);

  useEffect(() => {
    setVisibleCount(PUBLIC_PET_PAGE_SIZE);
  }, [filterCtx]);

  const pets = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;
  const totalFiltered = filtered.length;

  const loadMore = () => setVisibleCount(c => c + PUBLIC_PET_PAGE_SIZE);

  useEffect(() => {
    const ids = [...new Set(pets.map(p => p.reporter_id).filter(Boolean))] as string[];
    if (!ids.length) return;
    fetchProfilesByIds(ids).then(profiles =>
      setReporterProfiles(prev => ({ ...prev, ...profiles })),
    );
  }, [pets]);

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

  const activeFilterChips = [
    speciesParam && { key: "species",  label: SPECIES_LABEL[speciesParam] ?? speciesParam },
    colorParam   && { key: "color",    label: colorParam },
    sizeParams.length > 0 && { key: "size", label: `Tamaño: ${sizeParams.join(" · ")}` },
    dateFrom     && { key: "dateFrom", label: `Desde ${dateFrom}` },
    dateTo       && { key: "dateTo",   label: `Hasta ${dateTo}` },
  ].filter(Boolean) as { key: string; label: string }[];

  const totalActiveFilters =
    activeFilterChips.length + (statusParam ? 1 : 0) + (debouncedSearch.trim() ? 1 : 0);

  return (
    <div className="firulais-all-reports-route relative mx-auto flex w-full min-w-0 max-w-[430px] flex-col overflow-hidden bg-[#f6f7f8] font-display text-slate-900 dark:bg-[#101a22] dark:text-slate-100 lg:max-w-2xl">

      {/* Barra superior fija: el scroll va solo en el feed (evita overscroll que tapa header en Android). */}
      <div className="shrink-0 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">

        {/* Búsqueda */}
        <div className="flex min-w-0 items-center gap-2 px-4 pt-3 pb-2 sm:gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex size-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>

          <div className="flex min-w-0 flex-1 items-center bg-slate-100 dark:bg-slate-700 rounded-xl h-9 px-3 gap-2">
            <span className="material-symbols-outlined text-[18px] text-slate-400">search</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
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

          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            {/* Toggle layout */}
            <button
              onClick={() => setLayout(l => l === "grid" ? "list" : "grid")}
              className="flex size-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] text-slate-500 dark:text-slate-400">
                {layout === "grid" ? "view_list" : "grid_view"}
              </span>
            </button>

            {/* Botón filtros */}
            <button
              onClick={() =>
                navigate(`/filters?${searchParams.toString()}`, {
                  replace: true,
                  state: { backToAllReports: `${location.pathname}${location.search}` },
                })
              }
              className={`relative flex size-9 items-center justify-center rounded-xl cursor-pointer transition-colors ${
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
        </div>

        {/* Tabs de estado */}
        <div className="flex min-w-0 gap-1 px-4 pb-2">
          {STATUS_TABS.map(tab => {
            const isActive = statusParam === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusParam(tab.value)}
                className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#2b9dee] text-white shadow-sm shadow-[#2b9dee]/30"
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

        {/* Chips de filtros activos */}
        {activeFilterChips.length > 0 && (
          <div className="flex min-w-0 gap-2 overflow-x-auto px-4 pb-3 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
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

      {/* Feed: única zona con scroll vertical (mismo patrón que HomeScreen). */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain bg-[#f6f7f8] dark:bg-[#101a22] pb-mobile-tab lg:pb-8">

      {/* Contador */}
      <div className="flex min-w-0 items-center justify-between gap-2 px-4 pt-3 pb-2">
        <p className="min-w-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {loading
            ? "Buscando..."
            : <><span className="text-slate-900 dark:text-white font-extrabold">{totalFiltered}{hasMore ? "+" : ""}</span> reporte{totalFiltered !== 1 ? "s" : ""}</>
          }
        </p>
        <div className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-slate-400">
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>sort</span>
          Más recientes
        </div>
      </div>

      {/* Lista */}
      {layout === "grid" ? (
        /* Grid 2 columnas */
        <div className="grid min-w-0 grid-cols-2 gap-3 px-4">
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800">
              <div className="w-full aspect-square bg-slate-100 dark:bg-slate-700 animate-pulse" />
              <div className="p-2.5 flex flex-col gap-1.5">
                <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-700 rounded-full animate-pulse" />
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full animate-pulse" />
              </div>
            </div>
          ))}

          {!loading && pets.length === 0 && (
            <div className="col-span-2 flex flex-col items-center py-20 gap-4">
              <div className="w-24 h-24 rounded-full bg-[#2b9dee]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[44px] text-[#2b9dee]">pets</span>
              </div>
              <div className="text-center">
                <p className="text-[15px] font-bold text-slate-700 dark:text-slate-300">Sin resultados</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Probá con otros filtros o términos</p>
              </div>
              {(activeFilterChips.length > 0 || debouncedSearch.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                    setSearchParams(new URLSearchParams(), { replace: true });
                  }}
                  className="mt-1 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#2b9dee] cursor-pointer"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          {!loading && pets.map(pet => (
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
      ) : (
        /* Lista */
        <div className="flex min-w-0 flex-col gap-2.5 px-4">
          {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

          {!loading && pets.length === 0 && (
            <div className="flex flex-col items-center py-20 gap-4">
              <div className="w-24 h-24 rounded-full bg-[#2b9dee]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[44px] text-[#2b9dee]">pets</span>
              </div>
              <div className="text-center">
                <p className="text-[15px] font-bold text-slate-700 dark:text-slate-300">Sin resultados</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Probá con otros filtros o términos</p>
              </div>
              {(activeFilterChips.length > 0 || debouncedSearch.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                    setSearchParams(new URLSearchParams(), { replace: true });
                  }}
                  className="mt-1 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#2b9dee] cursor-pointer"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          {!loading && pets.map(pet => (
            <div
              key={pet.id}
              onClick={() => navigate(`/pet/${pet.id}`)}
              className="flex gap-3 bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-100 dark:border-slate-700 cursor-pointer active:scale-[0.99] transition-transform duration-150 hover:shadow-md"
            >
              {/* Thumbnail */}
              <div className="relative w-[92px] h-[92px] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0">
                {pet.image_url
                  ? <img src={pet.image_url} alt={pet.name ?? ""} className="w-full h-full object-cover" loading="lazy" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-[36px] text-slate-300 dark:text-slate-600">pets</span>
                    </div>
                }
                <div className={`absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide ${
                  pet.status === "lost" ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"
                }`}>
                  <div className="w-1 h-1 rounded-full bg-white" />
                  {pet.status === "lost" ? "Perdido" : "Hallado"}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[15px] font-extrabold leading-tight truncate dark:text-white">
                      {pet.status === "lost" ? (pet.name ?? "Sin nombre") : (pet.breed ?? "Mascota")}
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
                      {timeAgo(pet.created_at)}
                    </span>
                  </div>
                  {pet.breed && pet.status === "lost" && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{pet.breed}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 mt-1.5">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#2b9dee] shrink-0" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>
                      location_on
                    </span>
                    <span className="text-[11.5px] text-slate-600 dark:text-slate-400 truncate font-medium">{pet.location}</span>
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

              {/* Chevron */}
              <div className="flex items-center shrink-0">
                <div className="w-7 h-7 rounded-full bg-[#2b9dee]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#2b9dee]" style={{ fontSize: 16 }}>chevron_right</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more (solo si ya hay resultados; evita "Ver más" con lista vacía) */}
      {!loading && pets.length > 0 && hasMore && (
        <div className="px-4 mt-4">
          <button
            type="button"
            onClick={loadMore}
            className="w-full h-12 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
            Ver más reportes
          </button>
        </div>
      )}

      {!loading && !hasMore && pets.length > 0 && (
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6 pb-2">
          — Eso es todo —
        </p>
      )}
      </div>
    </div>
  );
}
