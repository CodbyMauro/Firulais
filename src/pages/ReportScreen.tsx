import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useTheme } from "../context/ThemeContext";
import L from "leaflet";
import { useAuth } from "../context/AuthContext";
import { createPet, uploadPetImage } from "../lib/petsService";
import ImageCropModal from "../components/ImageCropModal";

// ── Leaflet icon fix ──────────────────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const pickerIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:#2b9dee;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

// ── Data ──────────────────────────────────────────────────────────────────────
const COLORS = [
  "Sin color definido", "Negro", "Blanco", "Marrón / Café", "Dorado / Amarillo",
  "Gris / Plateado", "Naranja / Rojizo", "Crema / Beige",
  "Negro y blanco", "Marrón y blanco", "Tricolor", "Atigrado", "Moteado",
];

const BREEDS = [
  { group: "General", items: ["Sin raza definida", "Mestizo / Criollo"] },
  { group: "Perros", items: [
    "Labrador Retriever", "Golden Retriever", "Pastor Alemán", "Bulldog Francés",
    "Poodle / Caniche", "Beagle", "Chihuahua", "Dachshund / Salchicha",
    "Boxer", "Rottweiler", "Husky Siberiano", "Shih Tzu", "Yorkshire Terrier",
    "Maltés", "Pug / Carlino", "Border Collie", "Cocker Spaniel",
    "Doberman", "Pitbull / Am. Stafford", "Schnauzer",
  ]},
  { group: "Gatos", items: [
    "Gato común / Europeo", "Siamés", "Persa", "Maine Coon",
    "Bengalí", "Ragdoll", "Angora",
  ]},
];

const BA: [number, number] = [-34.6037, -58.3816];

// ── Reverse geocode ───────────────────────────────────────────────────────────
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
      { headers: { "Accept-Language": "es" } }
    );
    const data = await res.json();
    const a = data.address ?? {};
    return [a.road, a.suburb || a.neighbourhood || a.quarter, a.city || a.town || a.village]
      .filter(Boolean).join(", ") || data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// ── Map click handler ─────────────────────────────────────────────────────────
function PickerHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// ── Map Picker Modal ──────────────────────────────────────────────────────────
function MapPickerModal({
  initial, onConfirm, onClose,
}: {
  initial: [number, number] | null;
  onConfirm: (address: string, lat: number, lng: number) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const [pin, setPin] = useState<[number, number] | null>(initial);
  const [address, setAddress] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setUserPos([p.coords.latitude, p.coords.longitude]),
      () => {}
    );
  }, []);

  const handlePick = async (lat: number, lng: number) => {
    setPin([lat, lng]);
    setGeocoding(true);
    const addr = await reverseGeocode(lat, lng);
    setAddress(addr);
    setGeocoding(false);
  };

  const center = pin ?? userPos ?? BA;

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col max-w-[430px] mx-auto">
      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer
            key={theme}
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url={theme === "dark"
              ? "https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            }
          />
          <PickerHandler onPick={handlePick} />
          {pin && <Marker position={pin} icon={pickerIcon} />}
        </MapContainer>

        {/* Hint */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-md z-[1000]">
          <p className="text-xs font-semibold text-slate-700">Tocá el mapa para marcar la ubicación</p>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-[1000] w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>
      </div>

      {/* Bottom panel */}
      <div className="bg-white dark:bg-slate-800 px-4 pt-4 flex flex-col gap-3" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3 min-h-[48px]">
          <span className="material-symbols-outlined text-[20px] text-[#2b9dee]">location_on</span>
          {geocoding ? (
            <span className="text-sm text-slate-400">Buscando dirección...</span>
          ) : pin ? (
            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{address}</span>
          ) : (
            <span className="text-sm text-slate-400">Ninguna ubicación seleccionada</span>
          )}
        </div>
        <button
          disabled={!pin || geocoding}
          onClick={() => pin && onConfirm(address, pin[0], pin[1])}
          className="w-full h-12 bg-[#2b9dee] text-white rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirmar ubicación
        </button>
      </div>
    </div>
  );
}


// ── Main component ────────────────────────────────────────────────────────────
export default function ReportScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [type, setType] = useState<"lost" | "found">("lost");
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [color, setColor] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [reward, setReward] = useState("");
  const [showMapPicker, setShowMapPicker] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("El archivo seleccionado no es una imagen válida.");
      return;
    }
    setImageError(null);
    setCropSrc(URL.createObjectURL(file));
  };

  const handleCropConfirm = (dataUrl: string, file: File) => {
    setImagePreview(dataUrl);
    setImageFile(file);
    setCropSrc(null);
  };

  const removeImage = () => { setImageFile(null); setImagePreview(null); setImageError(null); };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) { setError("Debés iniciar sesión para reportar."); return; }
    if (!location.trim()) { setError("La ubicación es obligatoria."); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      let image_url: string | null = null;
      if (imageFile) image_url = await uploadPetImage(imageFile, user.id);
      await createPet({
        name: name.trim() || "Sin nombre",
        status: type,
        breed: breed || "",
        age: age.trim(),
        color: color || "",
        description: description.trim(),
        location: location.trim(),
        lat: locationCoords?.lat ?? null,
        lng: locationCoords?.lng ?? null,
        reward: reward.trim(),
        image_url,
        reporter_id: user.id,
        reporter_name: user.name,
      });
      navigate("/home");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al publicar el reporte.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "h-12 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#2b9dee]";
  const selectClass = `${inputClass} w-full appearance-none pr-10`;

  return (
    <>
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {showMapPicker && (
        <MapPickerModal
          initial={null}
          onConfirm={(addr, lat, lng) => { setLocation(addr); setLocationCoords({ lat, lng }); setShowMapPicker(false); }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      <div className="relative flex h-auto min-h-screen w-full max-w-[430px] lg:max-w-3xl mx-auto flex-col bg-[#f6f7f8] dark:bg-slate-900 font-display text-slate-900 dark:text-white" style={{ paddingBottom: "calc(40px + env(safe-area-inset-bottom))" }}>
        <div className="flex items-center p-4 pb-2 justify-between bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10">
          <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">arrow_back_ios</span>
          </button>
          <h2 className="text-lg font-bold flex-1 text-center pr-10">Reportar Mascota</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-5 flex flex-col gap-5">

          {/* Tipo */}
          <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="grid grid-cols-2">
              <button type="button" onClick={() => setType("lost")}
                className={`py-4 text-sm font-bold transition-colors ${type === "lost" ? "bg-red-600 text-white" : "text-slate-500 dark:text-slate-400"}`}>
                Mascota Perdida
              </button>
              <button type="button" onClick={() => { setType("found"); setName(""); setAge(""); }}
                className={`py-4 text-sm font-bold transition-colors ${type === "found" ? "bg-emerald-600 text-white" : "text-slate-500 dark:text-slate-400"}`}>
                Mascota Encontrada
              </button>
            </div>
          </div>

          {/* Foto */}
          <input ref={galleryInputRef} type="file" className="hidden" onChange={handleImageChange} />
          <button type="button" onClick={() => galleryInputRef.current?.click()}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 border-dashed overflow-hidden h-48 w-full cursor-pointer">
            {imagePreview ? (
              <div className="relative h-full w-full">
                <img src={imagePreview} alt="preview" className="w-full h-full object-contain" />
                <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(); }}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[18px]">close</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 h-full">
                <div className="w-12 h-12 bg-[#2b9dee]/10 dark:bg-[#2b9dee]/20 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px] text-[#2b9dee]">add_a_photo</span>
                </div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Agregar foto de la mascota</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">JPG, PNG hasta 10MB</p>
              </div>
            )}
          </button>
          {imageError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 -mt-2">
              <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
              <p className="text-red-600 text-sm font-medium">{imageError}</p>
            </div>
          )}

          {/* Info */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 flex flex-col gap-4 border border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {type === "lost" ? "Información de la mascota" : "¿Qué podés describir de la mascota?"}
            </h3>

            {type === "lost" && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nombre</span>
                <input className={inputClass} placeholder="Ej: Max, Luna..." value={name} onChange={(e) => setName(e.target.value)} />
              </label>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Raza</span>
              <div className="relative">
                <select className={selectClass} value={breed} onChange={(e) => setBreed(e.target.value)}>
                  <option value="">Seleccionar raza...</option>
                  {BREEDS.map((group) => (
                    <optgroup key={group.group} label={group.group}>
                      {group.items.map((b) => <option key={b} value={b}>{b}</option>)}
                    </optgroup>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px]">expand_more</span>
              </div>
            </label>

            <div className={`grid gap-3 ${type === "lost" ? "grid-cols-2" : "grid-cols-1"}`}>
              {type === "lost" && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Edad aproximada</span>
                  <input className={inputClass} placeholder="Ej: 2 años" value={age} onChange={(e) => setAge(e.target.value)} />
                </label>
              )}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Color</span>
                <div className="relative">
                  <select className={selectClass} value={color} onChange={(e) => setColor(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px]">expand_more</span>
                </div>
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Descripción</span>
              <textarea
                className="h-24 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#2b9dee] resize-none"
                placeholder="Señas particulares, comportamiento..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>

          {/* Ubicación */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 flex flex-col gap-3 border border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Ubicación <span className="text-red-500">*</span></h3>

            <button
              type="button"
              onClick={() => setShowMapPicker(true)}
              className={`w-full h-12 rounded-xl border text-sm flex items-center gap-3 px-4 transition-colors ${
                location ? "bg-[#2b9dee]/5 border-[#2b9dee]/30 text-slate-800 dark:text-slate-200" : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-400"
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${location ? "text-[#2b9dee]" : "text-slate-400"}`}>location_on</span>
              <span className="flex-1 text-left truncate">{location || "Marcar en el mapa..."}</span>
              <span className="material-symbols-outlined text-[18px] text-slate-400">map</span>
            </button>

            {location && (
              <button type="button" onClick={() => setShowMapPicker(true)}
                className="text-xs text-[#2b9dee] font-semibold text-left">
                Cambiar ubicación
              </button>
            )}
          </div>

          {/* Recompensa */}
          {type === "lost" && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 flex flex-col gap-4 border border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Recompensa (opcional)</h3>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                </div>
                <input
                  className="w-full h-12 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 pl-11 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#2b9dee]"
                  placeholder="Ej: $500 de recompensa"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 bg-[#2b9dee] text-white rounded-xl font-bold text-base shadow-lg shadow-[#2b9dee]/20 mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Publicando...
              </>
            ) : "Publicar Reporte"}
          </button>
        </form>
      </div>
    </>
  );
}
