import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { fetchServices, type Service } from "../lib/adminService";
import { MOCK_SERVICES } from "../data/mockServices";

type Tab = "Paseadores" | "Guarderías" | "Adiestradores";
const TABS: Tab[] = ["Paseadores", "Guarderías", "Adiestradores"];

/** Pasar a `false` para cargar desde Supabase (`services`). */
const USE_MOCK_SERVICES = true;

export default function ServicesScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("Paseadores");
  const [allServices, setAllServices] = useState<Service[]>(() =>
    USE_MOCK_SERVICES ? MOCK_SERVICES : [],
  );
  const [isLoading, setIsLoading] = useState(!USE_MOCK_SERVICES);

  useEffect(() => {
    if (USE_MOCK_SERVICES) return;

    fetchServices()
      .then((data) => setAllServices(data.filter((s) => s.is_active)))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = allServices.filter((s) => s.category === activeTab);

  const showCenteredPlaceholder = isLoading || filtered.length === 0;

  return (
    <div className="relative flex min-h-screen w-full max-w-[430px] lg:max-w-3xl mx-auto flex-col bg-[#f6f7f8] dark:bg-slate-900 font-display text-slate-900 dark:text-white pb-mobile-tab lg:pb-8">
      {/* Header */}
      <div className="flex items-center p-4 pb-2 justify-between bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center">
          <span className="material-symbols-outlined text-[24px]">arrow_back_ios</span>
        </button>
        <h2 className="min-w-0 flex-1 pr-10 text-center text-lg font-bold">Servicios y cuidados</h2>
      </div>

      {/* Tabs */}
      <div className="sticky top-[57px] z-10 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
        <div className="flex w-full justify-center px-4 gap-8 sm:gap-10">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 pt-2 text-sm font-bold border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-[#2b9dee] text-[#2b9dee]"
                  : "border-transparent text-slate-500 dark:text-slate-400"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 ${
          showCenteredPlaceholder ? "justify-center" : ""
        }`}
      >
        {isLoading && (
          <div className="flex justify-center">
            <svg className="animate-spin h-8 w-8 text-[#2b9dee]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center text-center text-slate-400 dark:text-slate-500 gap-3 px-4">
            <span className="material-symbols-outlined text-[52px]">directions_walk</span>
            <p className="text-sm font-medium">No hay {activeTab.toLowerCase()} disponibles por ahora</p>
          </div>
        )}

        {filtered.map((pro) => (
          <div
            key={pro.id}
            className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50 overflow-hidden ${!pro.available ? "opacity-80" : ""}`}
          >
            <div className="flex p-4 gap-4">
              <div className="relative size-20 shrink-0">
                {pro.image_url
                  ? <img src={pro.image_url} alt={pro.name} className="w-full h-full rounded-xl object-cover" />
                  : <div className="w-full h-full rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-slate-500">person</span>
                    </div>
                }
                {pro.verified && (
                  <div className="absolute -bottom-1 -right-1 flex size-[22px] items-center justify-center rounded-full border-2 border-slate-200 bg-[#2b9dee] text-white shadow-sm dark:border-slate-500 dark:shadow-md dark:shadow-black/30">
                    <span className="material-symbols-outlined block text-[14px]">verified</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-base">{pro.name}</h3>
                    {pro.zone && (
                      <p className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-0.5 mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {pro.zone}
                      </p>
                    )}
                  </div>
                  {pro.rating != null && (
                    <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500 px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="text-xs font-bold">{pro.rating}</span>
                    </div>
                  )}
                </div>
                {pro.tags && pro.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {pro.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded uppercase tracking-wider">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  {pro.available && pro.price_label ? (
                    <p className="text-[#2b9dee] font-bold text-sm">
                      Desde {pro.price_label} <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">/h</span>
                    </p>
                  ) : !pro.available ? (
                    <p className="text-slate-400 dark:text-slate-500 font-bold text-sm italic">Sin cupos hoy</p>
                  ) : <div />}
                  {pro.contact_url ? (
                    <a
                      href={pro.contact_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-xs font-bold px-4 py-2 rounded-xl transition-colors ${
                        pro.available
                          ? "bg-[#2b9dee] text-white"
                          : "bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 pointer-events-none"
                      }`}
                    >
                      {pro.available ? "Contactar" : "Perfil"}
                    </a>
                  ) : (
                    <button
                      disabled={!pro.available}
                      className={`text-xs font-bold px-4 py-2 rounded-xl transition-colors ${
                        pro.available
                          ? "bg-[#2b9dee] text-white"
                          : "bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      {pro.available ? "Contactar" : "Perfil"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
