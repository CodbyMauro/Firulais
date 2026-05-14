import type { FC, SVGProps } from "react";
import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { PET_SIZES } from "../lib/petsService";

/** Siluetas claras perro/gato (trazos inspirados en Lucide ISC). */
function SpeciesIconDog(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M11.25 16.25h1.5L12 17z" />
      <path d="M16 14v.5" />
      <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.702 11.702 0 0 0-.493-3.309" />
      <path d="M8 14v.5" />
      <path d="M8.5 8.5c-.384 1.05-1.083 2.028-2.344 2.5-1.931.722-3.576-.297-3.656-1-.113-.994 1.177-6.53 4-7 1.923-.321 3.651.845 3.651 2.235A7.497 7.497 0 0 1 14 5.277c0-1.39 1.844-2.598 3.767-2.277 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5" />
    </svg>
  );
}

function SpeciesIconCat(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z" />
      <path d="M8 14v.5" />
      <path d="M16 14v.5" />
      <path d="M11.25 16.25h1.5L12 17l-.75-.75Z" />
    </svg>
  );
}

const SPECIES_OPTIONS: {
  label: string;
  value: string;
  Icon?: FC<SVGProps<SVGSVGElement>>;
  materialIcon?: string;
}[] = [
  { label: "Perro", value: "dog", Icon: SpeciesIconDog },
  { label: "Gato", value: "cat", Icon: SpeciesIconCat },
];

const COLORS = [
  { label: "Negro",   hex: "#1a1a1a" },
  { label: "Blanco",  hex: "#ffffff", border: true },
  { label: "Marrón",  hex: "#8B4513" },
  { label: "Gris",    hex: "#94a3b8" },
  { label: "Dorado",  hex: "#d4a017" },
  { label: "Naranja", hex: "#f97316" },
];

type FiltersLocationState = { backToAllReports?: string };

export default function FiltersScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const backToAllReports =
    (state as FiltersLocationState | null)?.backToAllReports ?? "/all-reports";

  // Inicializar desde params actuales
  const [selectedSpecies, setSelectedSpecies] = useState<string>(
    searchParams.get("species") ?? ""
  );
  const [selectedSizes, setSelectedSizes] = useState<string[]>(searchParams.getAll("size"));
  const [selectedColors, setSelectedColors] = useState<string[]>(
    searchParams.get("color") ? [searchParams.get("color")!] : []
  );
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo,   setDateTo]   = useState(searchParams.get("dateTo")   ?? "");
  const [distance, setDistance] = useState(
    Number(searchParams.get("distance") ?? 15)
  );
  const [status, setStatus] = useState<string>(
    searchParams.get("status") ?? ""
  );

  const STATUS_OPTIONS = [
    { label: "Perdido",    value: "lost"  },
    { label: "Encontrado", value: "found" },
  ];

  const handleReset = () => {
    setSelectedSpecies("");
    setSelectedSizes([]);
    setSelectedColors([]);
    setDateFrom("");
    setDateTo("");
    setDistance(15);
    setStatus("");
  };

  const handleApply = () => {
    const params = new URLSearchParams();
    if (status)           params.set("status",   status);
    if (selectedSpecies)  params.set("species",  selectedSpecies);
    for (const s of selectedSizes) params.append("size", s);
    if (selectedColors.length) params.set("color", selectedColors[0]);
    if (dateFrom)         params.set("dateFrom", dateFrom);
    if (dateTo)           params.set("dateTo",   dateTo);
    if (distance !== 15)  params.set("distance", String(distance));
    navigate(`/all-reports?${params.toString()}`, { replace: true });
  };

  const toggleColor = (label: string) =>
    setSelectedColors(prev =>
      prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label]
    );

  const active = "flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-xl bg-[#2b9dee] text-white px-5 shadow-sm cursor-pointer";
  const inactive = "flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 cursor-pointer";

  const pct = ((distance - 1) / 49) * 100;

  return (
    <div className="mx-auto flex h-[100dvh] max-h-[100dvh] min-h-0 w-full max-w-[430px] flex-col overflow-hidden overscroll-none bg-[#f6f7f8] font-display text-slate-900 dark:bg-[#101a22] dark:text-slate-100">

      {/* Un solo área scroll: evita contenido cortado detrás del header y sticky raro */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain [scrollbar-gutter:stable]">
        {/* Top bar (scrollea con la vista; mismo padding horizontal que las secciones) */}
        <div className="fixed left-0 right-0 flex items-center gap-3 border-b border-slate-100 bg-white px-4 pb-3 pt-4 dark:border-slate-800 dark:bg-[#101a22]">
          <button
            type="button"
            onClick={() => navigate(backToAllReports, { replace: true })}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
          <h1 className="min-w-0 flex-1 text-center text-lg font-bold leading-tight tracking-tight">
            Filtros de Búsqueda
          </h1>
          <button
            type="button"
            onClick={handleReset}
            className="flex h-11 shrink-0 items-center px-3 text-[#2b9dee] cursor-pointer rounded-xl text-[15px] font-bold whitespace-nowrap"
          >
            Limpiar
          </button>
        </div>

        {/* Estado */}
        <h3 className="mt-18 px-4 pb-2 pt-5 text-lg font-bold leading-tight tracking-tight">Estado</h3>
        <div className="flex gap-3 px-4 py-2 flex-wrap">
          {STATUS_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setStatus(s => s === value ? "" : value)}
              className={status === value ? active : inactive}
            >
              <p className={`text-sm ${status === value ? "font-semibold" : "font-medium text-slate-700 dark:text-slate-300"}`}>
                {label}
              </p>
            </button>
          ))}
        </div>

        {/* Especie */}
        <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-6">Especie</h3>
        <div className="flex gap-3 px-4 py-2 flex-wrap">
          {SPECIES_OPTIONS.map(({ label, value, Icon, materialIcon }) => (
            <button
              key={value}
              onClick={() => setSelectedSpecies(s => s === value ? "" : value)}
              className={selectedSpecies === value ? active : inactive}
            >
              {Icon ? (
                <Icon
                  className="size-5 shrink-0"
                  style={{ color: selectedSpecies === value ? "white" : "#64748b" }}
                />
              ) : (
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{
                    color: selectedSpecies === value ? "white" : "#64748b",
                    fontVariationSettings: selectedSpecies === value ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {materialIcon}
                </span>
              )}
              <p className={`text-sm ${selectedSpecies === value ? "font-semibold" : "font-medium text-slate-700 dark:text-slate-300"}`}>
                {label}
              </p>
            </button>
          ))}
        </div>

        {/* Tamaño */}
        <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-6">Tamaño</h3>
        <div className="flex gap-3 px-4 py-2 flex-wrap">
          {PET_SIZES.map(size => {
            const on = selectedSizes.includes(size);
            return (
              <button
                key={size}
                onClick={() => setSelectedSizes(prev => on ? prev.filter(s => s !== size) : [...prev, size])}
                className={on ? active : inactive}
              >
                <p className={`text-sm ${on ? "font-semibold" : "font-medium text-slate-700 dark:text-slate-300"}`}>
                  {size}
                </p>
              </button>
            );
          })}
        </div>

        {/* Color de pelaje */}
        <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-6">Color de pelaje</h3>
        <div className="flex gap-3 px-4 py-2 flex-wrap">
          {COLORS.map(({ label, hex, border }) => {
            const on = selectedColors.includes(label);
            return (
              <button
                key={label}
                onClick={() => toggleColor(label)}
                className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-xl px-4 cursor-pointer ${
                  on ? "bg-[#2b9dee] text-white shadow-sm" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                }`}
              >
                <div
                  className="size-4 rounded-full shrink-0"
                  style={{ backgroundColor: hex, border: border ? "1px solid #cbd5e1" : on ? "1.5px solid white" : "none" }}
                />
                <p className={`text-sm ${on ? "font-semibold" : "font-medium text-slate-700 dark:text-slate-300"}`}>
                  {label}
                </p>
              </button>
            );
          })}
        </div>

        {/* Fecha de desaparición */}
        <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-6">Fecha de desaparición</h3>
        <div className="px-4 py-2 grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Desde</label>
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 gap-2">
              <span className="material-symbols-outlined text-slate-400 text-[20px] shrink-0">calendar_today</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="flex-1 bg-transparent text-sm text-slate-600 dark:text-slate-400 focus:outline-none min-w-0 cursor-pointer"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hasta</label>
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 gap-2">
              <span className="material-symbols-outlined text-slate-400 text-[20px] shrink-0">calendar_today</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="flex-1 bg-transparent text-sm text-slate-600 dark:text-slate-400 focus:outline-none min-w-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Distancia máxima */}
        <div className="px-4 pt-6 pb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold leading-tight tracking-[-0.015em]">Distancia máxima</h3>
            <span className="text-[#2b9dee] font-bold">{distance} km</span>
          </div>
          <div className="relative w-full h-6 flex items-center">
            <div className="absolute w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
            <div className="absolute h-1.5 bg-[#2b9dee] rounded-full" style={{ width: `${pct}%` }} />
            <input
              type="range" min={1} max={50} value={distance}
              onChange={e => setDistance(Number(e.target.value))}
              className="absolute w-full opacity-0 h-6 cursor-pointer"
            />
            <div
              className="absolute size-6 bg-white border-2 border-[#2b9dee] rounded-full shadow-md -ml-3 pointer-events-none"
              style={{ left: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-slate-500">1 km</span>
            <span className="text-xs text-slate-500">50 km</span>
          </div>
        </div>
      </div>

      {/* Footer: flujo normal (sin absolute) para no tapar contenido ni chocar con el scroll */}
      <footer
        className="shrink-0 border-t border-slate-100 bg-white px-4 pt-4 dark:border-slate-800 dark:bg-[#101a22]"
        style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          type="button"
          onClick={handleApply}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2b9dee] py-4 text-center font-bold text-white transition-colors hover:bg-[#2b9dee]/90"
        >
          <span>Aplicar Filtros</span>
          <span className="material-symbols-outlined text-[20px]">search</span>
        </button>
      </footer>
    </div>
  );
}
