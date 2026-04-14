import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import { usePets } from "../hooks/usePets";
import type { Pet } from "../lib/petsService";
import { useTheme } from "../context/ThemeContext";

// Fix default marker icons for Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const lostIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:#dc2626;width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 18],
});

const foundIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:#059669;width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 18],
});

const userIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#2b9dee;border:3px solid white;box-shadow:0 0 0 4px rgba(43,157,238,0.25)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

interface PetMarker {
  pet: Pet;
  lat: number;
  lng: number;
  distance?: number;
}

async function geocode(location: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "es" } });
    const data = await res.json();
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}

function formatRange(m: number): string {
  return m >= 1000 ? `${m / 1000}km` : `${m}m`;
}

const RANGE_OPTIONS = [500, 1000, 2000, 5000, 10000];

function FlyTo({ coords, zoom, trigger }: { coords: [number, number]; zoom: number; trigger: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo(coords, zoom, { duration: 1.2 }); }, [trigger]);
  return null;
}

// Buenos Aires default
const BA: [number, number] = [-34.6037, -58.3816];

export default function MapScreen() {
  const navigate = useNavigate();
  const { pets } = usePets();
  const { theme } = useTheme();
  const [markers, setMarkers] = useState<PetMarker[]>([]);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [flyTo, setFlyTo] = useState<{ coords: [number, number]; zoom: number; trigger: number } | null>(null);
  const [range, setRange] = useState(2000);
  const [showRangePicker, setShowRangePicker] = useState(false);
  const geocodedRef = useRef<Set<string>>(new Set());

  // Get user location
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, []);

  // Place markers
  useEffect(() => {
    pets.forEach((pet) => {
      if (geocodedRef.current.has(pet.id)) return;
      geocodedRef.current.add(pet.id);

      if (pet.lat != null && pet.lng != null) {
        setMarkers((prev) => [...prev, { pet, lat: pet.lat!, lng: pet.lng! }]);
      } else if (pet.location) {
        geocode(pet.location).then((coords) => {
          if (!coords) return;
          setMarkers((prev) => [...prev, { pet, ...coords }]);
        });
      }
    });
  }, [pets]);

  // Nearby markers sorted by distance
  const nearbyMarkers: PetMarker[] = markers
    .map((m) => ({
      ...m,
      distance: userPos ? haversine(userPos[0], userPos[1], m.lat, m.lng) : undefined,
    }))
    .filter((m) => !userPos || (m.distance !== undefined && m.distance <= range))
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

  const CAROUSEL_H = 172;

  return (
    <div className="relative w-full max-w-[430px] lg:max-w-none overflow-hidden [&_.leaflet-bottom]:pb-[calc(12px+env(safe-area-inset-bottom))]" style={{ height: "100dvh" }}>
      {/* Full-screen map */}
      <MapContainer
        center={userPos ?? BA}
        zoom={13}
        style={{ height: "100dvh", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          key={theme}
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url={theme === "dark"
            ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_matter/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          }
        />

        {flyTo && <FlyTo coords={flyTo.coords} zoom={flyTo.zoom} trigger={flyTo.trigger} />}

        {userPos && (
          <>
            <Marker position={userPos} icon={userIcon} />
            <Circle
              center={userPos}
              radius={range}
              pathOptions={{ color: "#2b9dee", fillColor: "#2b9dee", fillOpacity: 0.06, weight: 1.5, dashArray: "6 4" }}
            />
          </>
        )}

        {markers.map(({ pet, lat, lng }) => (
          <Marker
            key={pet.id}
            position={[lat, lng]}
            icon={pet.status === "lost" ? lostIcon : foundIcon}
            eventHandlers={{ click: () => setFlyTo({ coords: [lat, lng], zoom: 16, trigger: Date.now() }) }}
          >
            <Popup>
              <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", minWidth: 180 }}>
                {pet.image_url && (
                  <img src={pet.image_url} alt={pet.name ?? ""} style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ background: pet.status === "lost" ? "#dc2626" : "#059669", color: "white", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, textTransform: "uppercase" }}>
                    {pet.status === "lost" ? "Perdido" : "Encontrado"}
                  </span>
                </div>
                <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{pet.name ?? "Sin nombre"}</p>
                <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 8px" }}>{pet.location}</p>
                <button
                  onClick={() => navigate(`/pet/${pet.id}`)}
                  style={{ background: "#2b9dee", color: "white", border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", width: "100%" }}
                >
                  Ver detalle
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Floating back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute left-4 z-[1000] w-11 h-11 bg-white dark:bg-slate-800 rounded-full shadow-lg flex items-center justify-center"
        style={{ top: "calc(16px + env(safe-area-inset-top))" }}
      >
        <span className="material-symbols-outlined text-[22px] text-slate-800 dark:text-white">arrow_back</span>
      </button>

      {/* Legend */}
      <div
        className="absolute right-4 z-[1000] bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/50 px-3 py-2 flex flex-col gap-1.5"
        style={{ top: "calc(16px + env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-600" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Perdido</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-600" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Encontrado</span>
        </div>
      </div>

      {/* My location + FAB */}
      <div
        className="absolute right-4 z-[1000] flex flex-col gap-3"
        style={{ bottom: `calc(${CAROUSEL_H + 16}px + env(safe-area-inset-bottom))` }}
      >
        {userPos && (
          <button
            onClick={() => setFlyTo({ coords: userPos, zoom: 15, trigger: Date.now() })}
            className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-lg flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[22px] text-[#2b9dee]">my_location</span>
          </button>
        )}
      </div>

      {/* Range picker button */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-[1000]"
        style={{ bottom: `calc(${CAROUSEL_H + 12}px + env(safe-area-inset-bottom))` }}
      >
        <button
          onClick={() => setShowRangePicker((v) => !v)}
          className="flex items-center gap-1.5 bg-white dark:bg-slate-800 rounded-full shadow-lg px-4 py-2"
        >
          <span className="material-symbols-outlined text-[16px] text-[#2b9dee]">radar</span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Radio: {formatRange(range)}</span>
          <span className="material-symbols-outlined text-[16px] text-slate-400">{showRangePicker ? "expand_more" : "expand_less"}</span>
        </button>

        {showRangePicker && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-3 flex gap-2">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => { setRange(r); setShowRangePicker(false); }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  range === r
                    ? "bg-[#2b9dee] text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {formatRange(r)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom carousel */}
      <div
        className="absolute left-0 right-0 z-[1000]"
        style={{ bottom: 0, height: CAROUSEL_H, paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {nearbyMarkers.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg px-5 py-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-slate-400">pets</span>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {userPos ? "Sin mascotas en este radio" : "Activá tu ubicación para ver mascotas cercanas"}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 px-4 py-3 overflow-x-auto [&::-webkit-scrollbar]:hidden h-full items-center">
            {nearbyMarkers.map(({ pet, lat, lng, distance }) => (
              <div
                key={pet.id}
                onClick={() => { setFlyTo({ coords: [lat, lng], zoom: 16, trigger: Date.now() }); }}
                className="shrink-0 w-36 bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden cursor-pointer active:scale-95 transition-transform"
              >
                <div className="w-full h-20 bg-slate-100 dark:bg-slate-700 relative">
                  {pet.image_url
                    ? <img src={pet.image_url} alt={pet.name ?? ""} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-slate-500">pets</span>
                      </div>
                  }
                  <span className={`absolute top-1.5 left-1.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full text-white ${pet.status === "lost" ? "bg-red-500" : "bg-emerald-500"}`}>
                    {pet.status === "lost" ? "Perdido" : "Encontrado"}
                  </span>
                </div>
                <div className="px-2.5 py-2">
                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{pet.name ?? "Sin nombre"}</p>
                  {distance !== undefined && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <span className="material-symbols-outlined text-[12px] text-[#2b9dee]">near_me</span>
                      <span className="text-[11px] font-semibold text-[#2b9dee]">{formatDistance(distance)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
