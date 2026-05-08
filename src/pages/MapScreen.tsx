import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
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

// Breed arrays to determine pet type
const CAT_BREEDS = [
  "Gato común / Europeo", "Siamés", "Persa", "Maine Coon", "Bengalí", "Ragdoll", "Angora",
];

function getPetType(breed?: string | null): "cat" | "dog" {
  if (breed && CAT_BREEDS.includes(breed)) return "cat";
  return "dog";
}

// Lucide-style line icons. Drawn in 24x24 viewport, transformed inside the pin.
const DOG_ICON = `<g transform="translate(8 5) scale(1)" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M11.25 16.25h1.5L12 17z"/>
  <path d="M16 14v.5"/>
  <path d="M8 14v.5"/>
  <path d="M4.42 11.25A13 13 0 0 0 4 14.56C4 18.73 7.58 21 12 21s8-2.27 8-6.44a11.7 11.7 0 0 0-.49-3.31"/>
  <path d="M8.5 8.5c-.38 1.05-1.08 2.03-2.34 2.5-1.93.72-3.58-.3-3.66-1-.11-.99 1.18-6.53 4-7 1.92-.32 3.65.85 3.65 2.24A7.5 7.5 0 0 1 14 5c0-1.39 1.84-2.6 3.77-2.28 2.82.47 4.11 6.01 4 7-.08.7-1.73 1.72-3.66 1-1.26-.47-1.85-1.45-2.24-2.5"/>
</g>`;

const CAT_ICON = `<g transform="translate(8 5) scale(1)" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9 9 0 0 1 12 5Z"/>
  <path d="M8 14v.5"/>
  <path d="M16 14v.5"/>
  <path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/>
</g>`;

/** Generate SVG pin with Lucide-style animal icon. Returns SVG markup as string. */
function createPinSvg(petType: "dog" | "cat", color: string): string {
  const icon = petType === "cat" ? CAT_ICON : DOG_ICON;
  return `<svg width="36" height="44" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
    <path d="M 20 0 C 10 0 2 8 2 18 C 2 30 20 50 20 50 C 20 50 38 30 38 18 C 38 8 30 0 20 0 Z" fill="${color}" stroke="white" stroke-width="2"/>
    ${icon}
  </svg>`;
}


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

// Module-level cache: persists across re-mounts so re-entering the map is instant
let _lastKnownPos: [number, number] | null = null;

export default function MapScreen() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { pets } = usePets();
  const [markers, setMarkers] = useState<PetMarker[]>([]);
  const [userPos, setUserPos] = useState<[number, number] | null>(_lastKnownPos);
  const [flyTo, setFlyTo] = useState<{ coords: [number, number]; zoom: number; trigger: number } | null>(null);
  const [range, setRange] = useState(2000);
  const [showRangePicker, setShowRangePicker] = useState(false);
  const geocodedRef = useRef<Set<string>>(new Set());

  // Two-stage location strategy running in parallel:
  // Stage 1 — fast network/WiFi location (shows map in ~1s, may use cached result)
  // Stage 2 — GPS refinement (more accurate, runs concurrently with Stage 1)
  // Module cache makes re-entry instant while a fresh fix is fetched in background.
  useEffect(() => {
    const applyPos = (lat: number, lng: number) => {
      _lastKnownPos = [lat, lng];
      setUserPos([lat, lng]);
    };

    async function getUserLocation() {
      try {
        if (Capacitor.isNativePlatform()) {
          const perm = await Geolocation.requestPermissions();
          if (perm.location !== "granted") return;

          // Both stages start immediately — no sequential blocking
          await Promise.allSettled([
            Geolocation.getCurrentPosition({
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 30000,
            }).then((p) => applyPos(p.coords.latitude, p.coords.longitude)).catch(() => {}),
            Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            }).then((p) => applyPos(p.coords.latitude, p.coords.longitude)).catch(() => {}),
          ]);
        } else {
          navigator.geolocation?.getCurrentPosition(
            (pos) => applyPos(pos.coords.latitude, pos.coords.longitude),
            () => {},
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
          );
          navigator.geolocation?.getCurrentPosition(
            (pos) => applyPos(pos.coords.latitude, pos.coords.longitude),
            () => {},
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
        }
      } catch {
        // Permission denied — silently ignore
      }
    }
    getUserLocation();
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
    <div className="relative w-full max-w-[430px] lg:max-w-none overflow-hidden [&_.leaflet-bottom]:pb-[calc(12px+env(safe-area-inset-bottom))]" style={{ height: "calc(100dvh - var(--app-top-inset, 0px))" }}>
      {/* Full-screen map */}
      <MapContainer
        center={userPos ?? BA}
        zoom={13}
        style={{ height: "calc(100dvh - var(--app-top-inset, 0px))", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          key={theme}
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url={theme === "dark"
            ? "https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png"
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
            icon={new L.DivIcon({
              className: "",
              html: createPinSvg(
                getPetType(pet.breed),
                pet.status === "lost" ? "#dc2626" : "#059669"
              ),
              iconSize: [36, 44],
              iconAnchor: [18, 44],
            })}
            eventHandlers={{ click: () => setFlyTo({ coords: [lat, lng], zoom: 16, trigger: Date.now() }) }}
          >
            <Popup minWidth={210} maxWidth={210} className="firulais-popup">
              <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", width: 210, overflow: "hidden", borderRadius: 16, margin: -1 }}>
                {/* Image */}
                <div style={{ position: "relative", width: "100%", height: 110, background: "#f1f5f9", overflow: "hidden" }}>
                  {pet.image_url
                    ? <img src={pet.image_url} alt={pet.name ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#cbd5e1" }}>pets</span>
                      </div>
                  }
                  {/* Status badge */}
                  <span style={{
                    position: "absolute", top: 8, left: 8,
                    background: pet.status === "lost" ? "#dc2626" : "#059669",
                    color: "white", fontSize: 9, fontWeight: 800,
                    padding: "3px 8px", borderRadius: 99, textTransform: "uppercase",
                    letterSpacing: "0.05em", boxShadow: "0 1px 4px rgba(0,0,0,.25)",
                  }}>
                    {pet.status === "lost" ? "Perdido" : "Encontrado"}
                  </span>
                </div>

                {/* Body */}
                <div style={{ padding: "10px 12px 12px", background: theme === "dark" ? "#1e293b" : "#ffffff" }}>
                  <p style={{ fontWeight: 800, fontSize: 14, margin: "0 0 2px", color: theme === "dark" ? "#f1f5f9" : "#0f172a", lineHeight: 1.3 }}>
                    {pet.name ?? "Sin nombre"}
                  </p>
                  {pet.location && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 4, marginBottom: 10 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12, color: "#2b9dee", flexShrink: 0, marginTop: 1 }}>location_on</span>
                      <span style={{ fontSize: 11, color: theme === "dark" ? "#94a3b8" : "#64748b", lineHeight: 1.4 }}>{pet.location}</span>
                    </div>
                  )}
                  <button
                    onClick={() => navigate(`/pet/${pet.id}`)}
                    style={{
                      width: "100%", padding: "8px 0",
                      background: "linear-gradient(135deg, #2b9dee, #1a7bbf)",
                      color: "white", border: "none", borderRadius: 10,
                      fontWeight: 800, fontSize: 12, cursor: "pointer",
                      letterSpacing: "0.01em", boxShadow: "0 2px 8px rgba(43,157,238,.35)",
                    }}
                  >
                    Ver detalle
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Floating back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute left-4 z-[1000] w-11 h-11 bg-white dark:bg-slate-800 rounded-full shadow-lg flex items-center justify-center"
        style={{ top: "16px" }}
      >
        <span className="material-symbols-outlined text-[22px] text-slate-800 dark:text-white">arrow_back</span>
      </button>

      {/* Legend */}
      <div
        className="absolute right-4 z-[1000] bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/50 px-3 py-2 flex flex-col gap-1.5"
        style={{ top: "16px" }}
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
