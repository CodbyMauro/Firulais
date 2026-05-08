import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { usePet } from "../hooks/usePet";
import { useAuth } from "../context/AuthContext";
import { getOrCreateConversation } from "../lib/chatService";
import { fetchProfile, type Profile } from "../lib/profileService";
import { findSimilarPets, refreshSimilarPets, type SimilarPet, type SimilarPetsResponse } from "../lib/petsService";
import UserAvatar from "../components/UserAvatar";

const PRIMARY = "#2b9dee";

function SectionHead({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <div className="w-7 h-7 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-[#2b9dee]/10 dark:bg-[#2b9dee]/20">
        <span
          className="material-symbols-outlined text-[16px] text-[#2b9dee]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <span className="text-[13px] font-black text-slate-800 dark:text-white">{label}</span>
    </div>
  );
}

export default function PetDetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { pet, isLoading } = usePet(id);
  const { user } = useAuth();

  const isOwner = user?.id === pet?.reporter_id;
  const [contacting, setContacting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reporterProfile, setReporterProfile] = useState<Profile | null>(null);
  const [similarData, setSimilarData] = useState<SimilarPetsResponse | null>(null);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (pet?.reporter_id) fetchProfile(pet.reporter_id).then(setReporterProfile);
  }, [pet?.reporter_id]);

  const canSearchAI = isOwner && pet?.status === "lost";

  useEffect(() => {
    if (!pet?.id || !canSearchAI) return;
    setSimilarLoading(true);
    findSimilarPets(pet.id)
      .then(setSimilarData)
      .catch(() => {})
      .finally(() => setSimilarLoading(false));
  }, [pet?.id, canSearchAI]);

  const handleRefreshSimilar = async () => {
    if (!pet?.id || refreshing) return;
    setRefreshing(true);
    try {
      const data = await refreshSimilarPets(pet.id);
      setSimilarData(data);
    } catch {
      // error silencioso
    } finally {
      setRefreshing(false);
    }
  };

  const similarPets: SimilarPet[] = similarData?.results ?? [];

  const handleContact = async () => {
    if (!user || !pet || !pet.reporter_id) return;
    setContacting(true);
    try {
      const conv = await getOrCreateConversation(
        pet.id,
        pet.name,
        user.id,
        user.name,
        pet.reporter_id,
        pet.reporter_name ?? "Usuario",
      );
      navigate(`/chat/${conv.id}`);
    } finally {
      setContacting(false);
    }
  };

  const handleShare = async () => {
    if (!pet) return;
    const status = pet.status === "lost" ? "Perdido" : "Encontrado";
    const title = `${pet.name ?? "Mascota"} - ${status}`;
    const text = `${status}: ${pet.name ?? "mascota"} en ${pet.location ?? ""}. ${pet.description ?? ""}`.trim();
    const url = `${window.location.origin}/pet/${pet.id}`;
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ title, text, url, dialogTitle: "Compartir mascota" });
      } else if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(`${title}\n${text}\n${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // usuario canceló el share
    }
  };

  const formatDate = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return "ahora";
    if (diff < 60) return `hace ${diff}m`;
    if (diff < 1440) return `hace ${Math.floor(diff / 60)}h`;
    return `hace ${Math.floor(diff / 1440)}d`;
  };

  const getCombinedScore = (similarity: number, aiScore: number): number =>
    Math.round(similarity * 100 * 0.3 + aiScore * 0.7);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen max-w-[430px] lg:max-w-3xl mx-auto bg-white dark:bg-slate-800">
      <svg className="animate-spin h-8 w-8 text-[#2b9dee]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    </div>
  );

  if (!pet) return (
    <div className="flex flex-col items-center justify-center min-h-screen max-w-[430px] lg:max-w-3xl mx-auto bg-white dark:bg-slate-800 gap-4">
      <span className="material-symbols-outlined text-[48px] text-slate-300 dark:text-slate-600">pets</span>
      <p className="text-slate-500 dark:text-slate-400 text-sm">Mascota no encontrada</p>
      <button onClick={() => navigate("/home")} className="text-[#2b9dee] font-bold text-sm">
        Volver al inicio
      </button>
    </div>
  );

  const isLost = pet.status === "lost";
  const statusColor = isLost ? "#dc2626" : "#059669";
  const statusLabel = isLost ? "Perdido" : "Encontrado";

  const glassBtnStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.3)",
    backdropFilter: "blur(8px)",
  };

  return (
    <div className="relative flex min-h-screen w-full max-w-[430px] lg:max-w-3xl mx-auto flex-col font-display text-slate-900 dark:text-white">

      {/* ── Hero ── */}
      <div className="relative w-full flex-shrink-0" style={{ height: 420 }}>
        {pet.image_url ? (
          <img alt={pet.name ?? ""} src={pet.image_url} className="w-full h-full object-cover block" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-600">
            <span className="material-symbols-outlined text-[80px] text-slate-300 dark:text-slate-500">pets</span>
          </div>
        )}

        {/* gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 35%, rgba(0,0,0,0.65) 100%)" }}
        />

        {/* top buttons */}
        <div className="absolute flex justify-between items-center" style={{ top: 24, left: 16, right: 16 }}>
          <button
            onClick={() => navigate(-1)}
            style={glassBtnStyle}
            className="w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[22px] text-white">arrow_back</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              style={glassBtnStyle}
              className="relative w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[20px] text-white">share</span>
              {copied && (
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-white bg-black/70 rounded-lg px-2 py-1 z-50">
                  ¡Copiado!
                </span>
              )}
            </button>
            <button
              style={glassBtnStyle}
              className="w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[20px] text-white">bookmark</span>
            </button>
          </div>
        </div>

        {/* bottom: status + name + location */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-7">
          {/* status row */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <div className="relative w-5 h-5 flex items-center justify-center flex-shrink-0">
              <div className="pulse-ring absolute w-3 h-3 rounded-full" style={{ background: statusColor }} />
              <div className="absolute w-2 h-2 rounded-full z-10" style={{ background: statusColor }} />
            </div>
            <span className="text-white text-[11px] font-black uppercase tracking-[0.12em]">{statusLabel}</span>
            {pet.reward && (
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black text-white"
                style={{ background: "rgba(251,191,36,0.88)" }}
              >
                <span
                  className="material-symbols-outlined text-[12px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  payments
                </span>
                {pet.reward}
              </div>
            )}
          </div>
          <h1
            className="text-white text-[28px] font-black leading-tight mb-2"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
          >
            {isLost ? (pet.name || "Sin nombre") : (pet.breed || "Mascota encontrada")}
          </h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)" className="flex-shrink-0">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <span className="text-[rgba(255,255,255,0.85)] text-sm font-medium leading-snug">{pet.location}</span>
          </div>
        </div>
      </div>

      {/* ── Content sheet ── */}
      <div className={`-mt-6 relative z-10 bg-white dark:bg-slate-800 rounded-t-[28px] flex-1 px-5 lg:pb-8 ${isOwner ? "pb-6" : "pb-28"}`}>

        {/* pull handle */}
        <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-600 mx-auto mt-3 mb-5" />

        {/* stats */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[
            { label: "Raza",  value: pet.breed || "—", icon: "pets" },
            { label: "Edad",  value: (pet.age ?? "").trim() || "—", icon: "calendar_month" },
            { label: "Color", value: pet.color || "—", icon: "palette" },
          ].map(stat => (
            <div
              key={stat.label}
              className="flex flex-col items-center bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 rounded-2xl py-3 px-1.5"
            >
              <span
                className="material-symbols-outlined text-[18px] text-[#2b9dee]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {stat.icon}
              </span>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-[0.06em] mt-1 mb-0.5">
                {stat.label}
              </p>
              <p className="text-[13px] font-black text-slate-800 dark:text-white text-center leading-tight">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* description */}
        <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 mb-4">
          <SectionHead icon="notes" label="Descripción" />
          <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-[1.65]">
            {(pet.description ?? "").trim() || "Sin descripción"}
          </p>
        </div>

        {/* reporter */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 mb-4">
          <UserAvatar
            name={pet.reporter_name ?? "Anónimo"}
            avatarData={reporterProfile?.avatar_data}
            avatarUrl={reporterProfile?.avatar_url}
            size={44}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-900 dark:text-white">{pet.reporter_name ?? "Anónimo"}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Reportado {formatDate(pet.created_at)}</p>
          </div>
          {!isOwner && (
            <button
              onClick={handleContact}
              className="w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0 bg-[#2b9dee]/10 dark:bg-[#2b9dee]/20"
            >
              <span
                className="material-symbols-outlined text-[20px] text-[#2b9dee]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                chat
              </span>
            </button>
          )}
        </div>

        {/* AI matches */}
        {canSearchAI && (similarLoading || similarPets.length > 0 || similarData) && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2.5">
              <SectionHead icon="psychology" label="Coincidencias IA" />
              {similarData && !similarData.searches_exhausted && similarData.searches_remaining !== 0 && (
                similarData.premium_required ? (
                  <button
                    onClick={() => navigate("/premium")}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                  >
                    <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    Premium
                  </button>
                ) : similarData.fromCache ? (
                  <button
                    onClick={handleRefreshSimilar}
                    disabled={refreshing}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-[12px] ${refreshing ? "animate-spin" : ""}`}>
                      refresh
                    </span>
                    {refreshing ? "Buscando..." : "Actualizar"}
                  </button>
                ) : null
              )}
            </div>

            {/* info bar */}
            {similarData && !similarLoading && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 mb-2.5">
                <span
                  className="material-symbols-outlined text-[14px] text-[#2b9dee]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  info
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {similarData.searches_remaining != null && similarData.searches_remaining > 0
                    ? `${similarData.searches_remaining} búsqueda${similarData.searches_remaining !== 1 ? "s" : ""} gratis restante${similarData.searches_remaining !== 1 ? "s" : ""}`
                    : "La IA puede cometer errores. Resultados orientativos."}
                </span>
              </div>
            )}

            {/* loading */}
            {similarLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 py-2">
                <svg className="animate-spin h-4 w-4 text-[#2b9dee]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Analizando con IA...
              </div>
            )}

            {/* embedding pendiente */}
            {!similarLoading && similarData?.embedding_pending && (
              <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl px-4 py-3 mb-2.5">
                <svg className="animate-spin h-4 w-4 text-[#2b9dee] shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400">Analizando tu mascota con IA...</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-500">Tocá "Reintentar" en unos segundos.</p>
                </div>
                <button
                  onClick={handleRefreshSimilar}
                  disabled={refreshing}
                  className="shrink-0 px-3 py-1.5 bg-[#2b9dee] text-white text-xs font-bold rounded-xl disabled:opacity-50"
                >
                  {refreshing ? "..." : "Reintentar"}
                </button>
              </div>
            )}

            {/* sin resultados */}
            {!similarLoading && similarData && !similarData.embedding_pending && similarPets.length === 0 && (
              <div className="flex items-center justify-between py-2">
                <p className="text-xs text-slate-400 dark:text-slate-500">No encontramos coincidencias por ahora.</p>
                {!similarData.fromCache && (
                  <button
                    onClick={handleRefreshSimilar}
                    disabled={refreshing}
                    className="text-xs text-[#2b9dee] font-semibold disabled:opacity-50"
                  >
                    {refreshing ? "Buscando..." : "Reintentar"}
                  </button>
                )}
              </div>
            )}

            {/* similar pet cards */}
            {similarPets.length > 0 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-5 px-5">
                {similarPets.map(s => (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/pet/${s.id}`)}
                    className="shrink-0 w-[108px] bg-white dark:bg-slate-700 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-600 shadow-sm text-left"
                  >
                    <div className="relative w-full h-[76px] bg-slate-100 dark:bg-slate-600">
                      {s.image_url ? (
                        <img src={s.image_url} alt={s.name ?? ""} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-[32px] text-slate-400">pets</span>
                        </div>
                      )}
                      <div
                        className="absolute top-1.5 right-1.5 text-white text-[9.5px] font-black px-1.5 py-0.5 rounded-full"
                        style={{ background: PRIMARY }}
                      >
                        {getCombinedScore(s.similarity, s.ai_score ?? 0)}%
                      </div>
                    </div>
                    <div className="px-2.5 py-2">
                      <p className="text-xs font-black truncate text-slate-900 dark:text-white">
                        {s.name ?? "Sin nombre"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* CTAs premium */}
            {similarData?.premium_required && !similarData.searches_exhausted && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mt-2.5">
                <span
                  className="material-symbols-outlined text-amber-500 text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Actualizá en menos de 24hs</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-500">
                    Con Premium podés volver a buscar cuando quieras.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/premium")}
                  className="shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-xl"
                >
                  Ver planes
                </button>
              </div>
            )}
            {(similarData?.searches_exhausted || similarData?.searches_remaining === 0) && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mt-2.5">
                <span
                  className="material-symbols-outlined text-amber-500 text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Agotaste tus 2 búsquedas gratis</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-500">
                    Con Premium tenés búsquedas ilimitadas con IA.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/premium")}
                  className="shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-xl"
                >
                  Ver planes
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Map section ── */}
        {pet.location && (
          <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 mb-4">
            <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
              <span
                className="material-symbols-outlined text-[14px] text-[#2b9dee]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                location_on
              </span>
              <span className="text-[13px] font-black text-slate-800 dark:text-white">Última ubicación</span>
            </div>
            <div
              className="relative h-[120px]"
              style={{ background: "linear-gradient(120deg, #e0f2fe, #ecfccb)" }}
            >
              {/* grid pattern */}
              <div
                className="absolute inset-0 opacity-50"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              />
              {/* pin */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[65%]">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: PRIMARY, boxShadow: `0 4px 14px rgba(43,157,238,0.45)` }}
                >
                  <span
                    className="material-symbols-outlined text-[18px] text-white"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    pets
                  </span>
                </div>
                <div
                  className="w-2 h-2 rounded-full mx-auto -mt-0.5 opacity-35"
                  style={{ background: PRIMARY }}
                />
              </div>
              {/* ver en mapa */}
              <button
                onClick={() => navigate("/map")}
                className="absolute bottom-2 right-2 flex items-center gap-1 text-[11px] font-bold text-slate-700 rounded-xl px-2.5 py-1.5 shadow-sm"
                style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)" }}
              >
                <span
                  className="material-symbols-outlined text-[12px] text-[#2b9dee]"
                  style={{ fontVariationSettings: "'FILL' 0" }}
                >
                  open_in_new
                </span>
                Ver en mapa
              </button>
            </div>
            <div className="px-4 py-2.5 bg-white dark:bg-slate-800">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{pet.location}</p>
            </div>
          </div>
        )}


      </div>

      {/* ── Floating CTAs (non-owner) ── */}
      {!isOwner && (
        <div
          className="fixed left-0 right-0 max-w-[430px] lg:max-w-3xl mx-auto z-50 bg-white dark:bg-slate-900 px-5 pt-3"
          style={{
            bottom: 0,
            paddingBottom: "calc(env(safe-area-inset-bottom, 4px) + 10px",
            boxShadow: "0 -8px 24px rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex gap-2.5">
            <button
              onClick={handleContact}
              disabled={contacting}
              className="flex-1 h-[54px] rounded-[18px] font-black text-sm flex items-center justify-center gap-2 border-2 disabled:opacity-60"
              style={{ borderColor: PRIMARY, color: PRIMARY }}
            >
              {contacting ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <span className="material-symbols-outlined text-[18px]">chat</span>
              )}
              Contactar
            </button>
            <button
              className="flex-1 h-[54px] rounded-[18px] font-black text-sm text-white flex items-center justify-center gap-2 border-0"
              style={{
                background: `linear-gradient(135deg, ${PRIMARY}, rgba(43,157,238,0.7))`,
                boxShadow: `0 8px 20px rgba(43,157,238,0.35)`,
              }}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              Lo reconozco
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
