import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useTheme } from "../../context/ThemeContext";
import L from "leaflet";
import {
  fetchHelpCenters, createHelpCenter, updateHelpCenter, deleteHelpCenter,
  type HelpCenter, type HelpCenterInput,
} from "../../lib/adminService";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const pinIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:#2b9dee;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

const BA: [number, number] = [-34.6037, -58.3816];

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
      { headers: { "Accept-Language": "es" } }
    );
    const data = await res.json();
    const a = data.address ?? {};
    return [a.road, a.suburb || a.neighbourhood, a.city || a.town || a.village]
      .filter(Boolean).join(", ") || data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

function MapPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

const EMPTY: HelpCenterInput = {
  name: "", address: "", phone: "", hours: "", maps_url: "",
  lat: null, lng: null, is_active: true,
};

export default function AdminHelpCentersScreen() {
  const { theme } = useTheme();
  const [items, setItems] = useState<HelpCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HelpCenter | null>(null);
  const [form, setForm] = useState<HelpCenterInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const load = () => {
    setLoading(true);
    fetchHelpCenters().then(setItems).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (item: HelpCenter) => {
    setEditing(item);
    setForm({
      name: item.name, address: item.address ?? "", phone: item.phone ?? "",
      hours: item.hours ?? "", maps_url: item.maps_url ?? "",
      lat: item.lat, lng: item.lng, is_active: item.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) await updateHelpCenter(editing.id, form);
      else await createHelpCenter(form);
      setModalOpen(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteHelpCenter(deleteId); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Error al eliminar"); }
    finally { setDeleteId(null); }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setForm((f) => ({ ...f, lat, lng }));
    setGeocoding(true);
    const address = await reverseGeocode(lat, lng);
    setForm((f) => ({ ...f, address }));
    setGeocoding(false);
  };

  const set = (k: keyof HelpCenterInput, v: string | boolean | number | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mapCenter: [number, number] =
    form.lat && form.lng ? [form.lat, form.lng] : BA;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <p className="text-slate-500 text-sm">{items.length} registros</p>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-[#2b9dee] text-white text-sm font-bold rounded-xl shadow-sm">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nuevo centro
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin h-8 w-8 text-[#2b9dee]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-500">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 hidden md:table-cell">Dirección</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 hidden sm:table-cell">Horario</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 hidden lg:table-cell">Coords</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 hidden lg:table-cell">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#2b9dee]/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px] text-[#2b9dee]">local_hospital</span>
                      </div>
                      <p className="font-semibold">{item.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell text-xs max-w-[180px] truncate">{item.address ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500 hidden sm:table-cell text-xs">{item.hours ?? "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {item.lat && item.lng
                      ? <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                          <span className="material-symbols-outlined text-[12px]">location_on</span>
                          Ubicado
                        </span>
                      : <span className="text-[11px] text-slate-400">Sin ubicación</span>
                    }
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {item.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onClick={() => setDeleteId(item.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">No hay centros aún</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !saving && setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold mb-5">{editing ? "Editar centro" : "Nuevo centro"}</h3>
            <div className="flex flex-col gap-4">
              <Field label="Nombre *" value={form.name} onChange={(v) => set("name", v)} />
              <Field label="Teléfono" value={form.phone ?? ""} onChange={(v) => set("phone", v)} placeholder="+54 11 1234-5678" />
              <Field label="Horario de atención" value={form.hours ?? ""} onChange={(v) => set("hours", v)} placeholder="Lun-Vie 9am-6pm" />
              <Field label="Link de Google Maps" value={form.maps_url ?? ""} onChange={(v) => set("maps_url", v)} placeholder="https://maps.google.com/..." />

              {/* Map picker */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                  Ubicación en el mapa
                  <span className="text-slate-400 font-normal ml-1">— tocá para marcar</span>
                </label>
                <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: 220 }}>
                  <MapContainer
                    center={mapCenter}
                    zoom={13}
                    style={{ height: "100%", width: "100%" }}
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
                    <MapPicker onPick={handleMapClick} />
                    {form.lat && form.lng && (
                      <Marker position={[form.lat, form.lng]} icon={pinIcon} />
                    )}
                  </MapContainer>
                </div>
                {geocoding && (
                  <p className="text-xs text-slate-400 mt-1">Obteniendo dirección...</p>
                )}
                {form.lat && form.lng && !geocoding && (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                  </p>
                )}
              </div>

              {/* Dirección (auto-completada o manual) */}
              <Field
                label="Dirección"
                value={form.address ?? ""}
                onChange={(v) => set("address", v)}
                placeholder="Se completa al marcar en el mapa, o escribí manualmente"
              />

              <Toggle label="Activo" value={form.is_active} onChange={(v) => set("is_active", v)} />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} disabled={saving} className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.name} className="flex-1 h-11 rounded-xl bg-[#2b9dee] text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm text-center">
            <p className="font-bold mb-2">¿Eliminar este centro?</p>
            <p className="text-sm text-slate-500 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 h-11 rounded-xl bg-red-500 text-white text-sm font-bold">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 mb-1 block">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:border-[#2b9dee]" />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <button type="button" onClick={() => onChange(!value)} className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-[#2b9dee]" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}
