import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchProfile, upsertProfile, fileToBase64, type Profile } from "../lib/profileService";

/** Redimensiona y comprime una imagen a WebP sin pérdida visible (máx 400×400px, calidad 0.85) */
async function compressAvatar(file: File): Promise<File> {
  const MAX = 400;
  const QUALITY = 0.85;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("No se pudo comprimir la imagen")); return; }
          resolve(new File([blob], "avatar.webp", { type: "image/webp" }));
        },
        "image/webp",
        QUALITY,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen")); };
    img.src = url;
  });
}

export default function EditProfileScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ full_name: "", phone: "", city: "" });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchProfile(user.id).then((p: Profile | null) => {
      if (p) {
        setForm({ full_name: p.full_name ?? "", phone: p.phone ?? "", city: p.city ?? "" });
        setAvatarUrl(p.avatar_data ?? p.avatar_url);
      } else {
        // Pre-cargar email como nombre si no tiene perfil
        setForm((f) => ({ ...f, full_name: user.email?.split("@")[0] ?? "" }));
      }
    });
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Mostrar preview con la imagen original mientras se comprime
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    try {
      const compressed = await compressAvatar(file);
      setAvatarFile(compressed);
    } catch {
      setAvatarFile(file); // fallback sin compresión
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.full_name.trim()) { setError("El nombre no puede estar vacío"); return; }
    setSaving(true);
    setError(null);
    try {
      let avatarData: string | undefined;
      if (avatarFile) {
        avatarData = await fileToBase64(avatarFile);
      }
      await upsertProfile(user.id, { ...form, ...(avatarData ? { avatar_data: avatarData } : {}) });
      navigate("/profile");
    } catch {
      setError("No se pudo guardar. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = avatarPreview ?? avatarUrl;
  const initials = form.full_name
    ? form.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="relative flex min-h-screen w-full max-w-[430px] lg:max-w-xl mx-auto flex-col bg-[#f6f7f8] dark:bg-slate-900 font-display text-slate-900 dark:text-white pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center p-4 pb-3 justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex size-10 items-center justify-center"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back_ios</span>
          </button>
          <h2 className="text-lg font-bold flex-1 text-center pr-10">Editar perfil</h2>
        </div>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 py-8 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-[#2b9dee]/20 flex items-center justify-center overflow-hidden border-2 border-[#2b9dee]/30">
            {displayAvatar ? (
              <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-[#2b9dee]">{initials}</span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 bg-[#2b9dee] rounded-full flex items-center justify-center shadow-md"
          >
            <span className="material-symbols-outlined text-white text-[16px]">photo_camera</span>
          </button>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="text-sm font-semibold text-[#2b9dee]"
        >
          Cambiar foto
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      </div>

      {/* Campos */}
      <div className="flex flex-col gap-3 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
          <Field
            label="Nombre completo"
            icon="person"
            value={form.full_name}
            onChange={(v) => setForm((f) => ({ ...f, full_name: v }))}
            placeholder="Tu nombre"
          />
          <Field
            label="Teléfono"
            icon="phone"
            value={form.phone}
            onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            placeholder="Ej: +54 9 11 1234-5678"
            type="tel"
          />
          <Field
            label="Ciudad / Barrio"
            icon="location_on"
            value={form.city}
            onChange={(v) => setForm((f) => ({ ...f, city: v }))}
            placeholder="Ej: Palermo, CABA"
          />
        </div>

        {/* Email (solo lectura) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="material-symbols-outlined text-[20px] text-slate-400">mail</span>
            <div className="flex-1">
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Correo electrónico</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
            <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-full font-medium">No editable</span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 font-medium text-center">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 bg-[#2b9dee] text-white font-bold rounded-2xl disabled:opacity-60 transition-opacity mt-2"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label, icon, value, onChange, placeholder, type = "text",
}: {
  label: string; icon: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="material-symbols-outlined text-[20px] text-[#2b9dee] shrink-0">{icon}</span>
      <div className="flex-1">
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-0.5">{label}</p>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none"
        />
      </div>
    </div>
  );
}
