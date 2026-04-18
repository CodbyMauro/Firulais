import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const SPECIES_OPTIONS = [
  { label: "Perro", value: "dog",  icon: "psychiatry"   },
  { label: "Gato",  value: "cat",  icon: "cruelty_free" },
  { label: "Otros", value: "other",icon: "more_horiz"   },
];

const SIZES = ["Pequeño", "Mediano", "Grande"];

const COLORS = [
  { label: "Negro",   hex: "#1a1a1a" },
  { label: "Blanco",  hex: "#ffffff", border: true },
  { label: "Marrón",  hex: "#8B4513" },
  { label: "Gris",    hex: "#94a3b8" },
  { label: "Dorado",  hex: "#d4a017" },
  { label: "Naranja", hex: "#f97316" },
];

export default function FiltersScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Inicializar desde params actuales
  const [selectedSpecies, setSelectedSpecies] = useState<string>(
    searchParams.get("species") ?? ""
  );
  const [selectedSizes,  setSelectedSizes]  = useState<string[]>([]);
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
    if (selectedColors.length) params.set("color", selectedColors[0]);
    if (dateFrom)         params.set("dateFrom", dateFrom);
    if (dateTo)           params.set("dateTo",   dateTo);
    if (distance !== 15)  params.set("distance", String(distance));
    navigate(`/reports?${params.toString()}`, { replace: true });
  };

  const toggleColor = (label: string) =>
    setSelectedColors(prev =>
      prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label]
    );

  const active = "flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-xl bg-[#2b9dee] text-white px-5 shadow-sm cursor-pointer";
  const inactive = "flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 cursor-pointer";

  const pct = ((distance - 1) / 49) * 100;

  return (
    <div className="relative flex h-screen w-full flex-col bg-[#f6f7f8] dark:bg-[#101a22] font-display text-slate-900 dark:text-slate-100 overflow-x-hidden mx-auto max-w-[430px]">

      {/* TopAppBar */}
      <div className="flex items-center bg-white dark:bg-[#101a22] p-4 pb-2 justify-between sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="flex size-12 shrink-0 items-center justify-start cursor-pointer">
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
          Filtros de Búsqueda
        </h2>
        <div className="flex w-12 items-center justify-end">
          <button onClick={handleReset} className="text-[#2b9dee] text-base font-bold cursor-pointer">
            Limpiar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">

        {/* Estado */}
        <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-6">Estado</h3>
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
          {SPECIES_OPTIONS.map(({ label, value, icon }) => (
            <button
              key={value}
              onClick={() => setSelectedSpecies(s => s === value ? "" : value)}
              className={selectedSpecies === value ? active : inactive}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{
                  color: selectedSpecies === value ? "white" : "#64748b",
                  fontVariationSettings: selectedSpecies === value ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {icon}
              </span>
              <p className={`text-sm ${selectedSpecies === value ? "font-semibold" : "font-medium text-slate-700 dark:text-slate-300"}`}>
                {label}
              </p>
            </button>
          ))}
        </div>

        {/* Tamaño */}
        <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-6">Tamaño</h3>
        <div className="flex gap-3 px-4 py-2 flex-wrap">
          {SIZES.map(size => {
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
        <div className="px-4 pt-6">
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

        {/* Ubicación de referencia */}
        <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-6">Ubicación de referencia</h3>
        <div className="px-4 pb-4">
          <div className="relative h-40 w-full rounded-xl overflow-hidden mb-2 bg-slate-200 dark:bg-slate-700 flex items-center justify-center cursor-pointer">
            <span className="material-symbols-outlined text-slate-400 text-[48px]">map</span>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#2b9dee] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                location_on
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-500 text-center">Tocá para cambiar la ubicación</p>
        </div>

      </div>

      {/* Footer fijo */}
      <div className="absolute bottom-0 left-0 w-full p-4 bg-white dark:bg-[#101a22] border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={handleApply}
          className="w-full bg-[#2b9dee] hover:bg-[#2b9dee]/90 text-white font-bold py-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Aplicar Filtros</span>
          <span className="material-symbols-outlined text-[20px]">search</span>
        </button>
      </div>
    </div>
  );
}
