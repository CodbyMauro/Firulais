import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import BottomNav from "../components/BottomNav";
import { fetchHelpCenters, type HelpCenter } from "../lib/adminService";
import { useTheme } from "../context/ThemeContext";
import { foldAccentsContains } from "../lib/foldAccents";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const pinIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:#2b9dee;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  popupAnchor: [0, -28],
});

const BA: [number, number] = [-34.6037, -58.3816];

export default function HelpCentersScreen() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [centers, setCenters] = useState<HelpCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "map">("list");

  useEffect(() => {
    fetchHelpCenters()
      .then((data) => setCenters(data.filter((c) => c.is_active)))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = search.trim()
    ? centers.filter(
        (c) => foldAccentsContains(c.name, search) || foldAccentsContains(c.address, search),
      )
    : centers;

  const withCoords = centers.filter((c) => c.lat && c.lng);

  const mapCenter: [number, number] =
    withCoords.length > 0
      ? [withCoords[0].lat!, withCoords[0].lng!]
      : BA;

  return (
    <div className={`relative flex h-auto min-h-screen w-full max-w-[430px] lg:max-w-3xl mx-auto flex-col bg-[#f6f7f8] dark:bg-slate-900 font-display text-slate-900 dark:text-white ${view === "list" ? "pb-mobile-tab lg:pb-8" : ""}`}>
      {/* Header */}
      <div className="flex items-center p-4 pb-2 justify-between bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center">
          <span className="material-symbols-outlined text-[24px]">arrow_back_ios</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center">Centros de Ayuda</h2>
        {/* Toggle lista / mapa */}
        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-0.5">
          <button
            onClick={() => setView("list")}
            className={`flex items-center justify-center w-9 h-8 rounded-[10px] transition-colors ${view === "list" ? "bg-white dark:bg-slate-600 shadow-sm text-[#2b9dee]" : "text-slate-400"}`}
          >
            <span className="material-symbols-outlined text-[18px]">list</span>
          </button>
          <button
            onClick={() => setView("map")}
            className={`flex items-center justify-center w-9 h-8 rounded-[10px] transition-colors ${view === "map" ? "bg-white dark:bg-slate-600 shadow-sm text-[#2b9dee]" : "text-slate-400"}`}
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
          </button>
        </div>
      </div>

      {/* Search — solo en lista */}
      {view === "list" && (
        <div className="px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
          <div className="flex w-full items-stretch rounded-xl h-12">
            <div className="text-slate-400 flex bg-slate-100 dark:bg-slate-700 items-center justify-center pl-4 rounded-l-xl">
              <span className="material-symbols-outlined">search</span>
            </div>
            <input
              className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-xl text-slate-900 dark:text-white focus:outline-none bg-slate-100 dark:bg-slate-700 h-full placeholder:text-slate-500 dark:placeholder:text-slate-400 px-3 text-sm"
              placeholder="Buscar refugios, veterinarias..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Vista LISTA */}
      {view === "list" && (
        <div className="px-4 py-4 flex flex-col gap-3">
          {isLoading && (
            <div className="flex justify-center py-16">
              <svg className="animate-spin h-8 w-8 text-[#2b9dee]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center py-16 text-slate-400 dark:text-slate-500 gap-3">
              <span className="material-symbols-outlined text-[52px]">local_hospital</span>
              <p className="text-sm font-medium">
                {search ? "No hay resultados para esa búsqueda" : "No hay centros disponibles aún"}
              </p>
            </div>
          )}

          {filtered.map((center) => (
            <div key={center.id} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50">
              <div className="h-1.5 bg-gradient-to-r from-[#2b9dee] to-[#1a7bbf]" />
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 bg-[#2b9dee] rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-[#2b9dee]/30">
                    <span className="material-symbols-outlined text-[22px] text-white">local_hospital</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base leading-tight text-slate-900 dark:text-white">{center.name}</h3>
                    {center.hours && (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full mt-0.5 inline-block ${
                        center.hours.toLowerCase().includes("24")
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                      }`}>
                        {center.hours.toLowerCase().includes("24") ? "🕐 24 horas" : `🕐 ${center.hours}`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 mb-4">
                  {center.address && (
                    <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400">
                      <span className="material-symbols-outlined text-[#2b9dee] shrink-0 mt-0.5" style={{ fontSize: 16 }}>location_on</span>
                      <span className="text-xs leading-relaxed">{center.address}</span>
                    </div>
                  )}
                  {center.phone && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <span className="material-symbols-outlined text-[#2b9dee] shrink-0" style={{ fontSize: 16 }}>call</span>
                      <span className="text-xs font-medium">{center.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {center.phone && (
                    <a href={`tel:${center.phone}`} className="flex-1 h-10 rounded-xl border-2 border-[#2b9dee] text-[#2b9dee] font-bold text-xs flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>call</span>
                      Llamar
                    </a>
                  )}
                  {center.maps_url && (
                    <a href={center.maps_url} target="_blank" rel="noopener noreferrer" className="flex-1 h-10 rounded-xl bg-[#2b9dee] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#2b9dee]/25">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>directions</span>
                      Cómo llegar
                    </a>
                  )}
                  {!center.phone && !center.maps_url && (
                    <div className="flex-1 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl text-xs flex items-center justify-center text-slate-400">
                      Sin datos de contacto
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vista MAPA */}
      {view === "map" && (
        <div className="flex-1 flex flex-col" style={{ minHeight: "calc(100vh - 57px)" }}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <svg className="animate-spin h-8 w-8 text-[#2b9dee]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            </div>
          ) : withCoords.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400 dark:text-slate-500 gap-3 px-6 text-center">
              <span className="material-symbols-outlined text-[52px]">location_off</span>
              <p className="text-sm font-medium">Ningún centro tiene ubicación cargada aún</p>
              <p className="text-xs">Los centros aparecen en el mapa una vez que se les asigna una ubicación desde el backoffice</p>
            </div>
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={12}
              style={{ flex: 1, height: "100%", minHeight: "calc(100vh - 57px)" }}
              zoomControl={true}
            >
              <TileLayer
                key={theme}
                attribution="&copy; OpenStreetMap &copy; CARTO"
                url={theme === "dark"
                  ? "https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png"
                  : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                }
              />
              {withCoords.map((center) => (
                <Marker key={center.id} position={[center.lat!, center.lng!]} icon={pinIcon}>
                  <Popup minWidth={220} maxWidth={260}>
                    <div style={{ fontFamily: "inherit", padding: "2px 0" }}>
                      {/* Header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#2b9dee", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "white" }}>local_hospital</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: 13, margin: 0, lineHeight: 1.3, color: "#0f172a" }}>{center.name}</p>
                          {center.hours && (
                            <span style={{
                              display: "inline-block", marginTop: 3,
                              fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 20,
                              background: center.hours.toLowerCase().includes("24") ? "#d1fae5" : "#f1f5f9",
                              color: center.hours.toLowerCase().includes("24") ? "#059669" : "#64748b",
                            }}>
                              🕐 {center.hours.toLowerCase().includes("24") ? "24 horas" : center.hours}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Info rows */}
                      {center.address && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 5 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#2b9dee", flexShrink: 0, marginTop: 1 }}>location_on</span>
                          <span style={{ fontSize: 11, color: "#475569", lineHeight: 1.4 }}>{center.address}</span>
                        </div>
                      )}
                      {center.phone && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#2b9dee", flexShrink: 0 }}>call</span>
                          <span style={{ fontSize: 11, color: "#475569", fontWeight: 500 }}>{center.phone}</span>
                        </div>
                      )}

                      {/* Divider */}
                      {(center.phone || center.maps_url) && (
                        <div style={{ height: 1, background: "#f1f5f9", margin: "8px 0" }} />
                      )}

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 6 }}>
                        {center.phone && (
                          <a href={`tel:${center.phone}`} style={{
                            flex: 1, padding: "7px 0", background: "transparent",
                            border: "1.5px solid #2b9dee", color: "#2b9dee", borderRadius: 10,
                            fontSize: 11, fontWeight: 700, textAlign: "center", textDecoration: "none",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>call</span>
                            Llamar
                          </a>
                        )}
                        {center.maps_url && (
                          <a href={center.maps_url} target="_blank" rel="noopener noreferrer" style={{
                            flex: 1, padding: "7px 0", background: "#2b9dee", color: "white",
                            borderRadius: 10, fontSize: 11, fontWeight: 700, textAlign: "center",
                            textDecoration: "none", display: "flex", alignItems: "center",
                            justifyContent: "center", gap: 4,
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>directions</span>
                            Cómo llegar
                          </a>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
      )}

      {view === "list" && <BottomNav />}
    </div>
  );
}
