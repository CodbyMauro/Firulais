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
      // usuario canceló el share, no hacer nada
    }
  };

  const formatDate = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return "ahora";
    if (diff < 60) return `hace ${diff}m`;
    if (diff < 1440) return `hace ${Math.floor(diff / 60)}h`;
    return `hace ${Math.floor(diff / 1440)}d`;
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen max-w-[430px] lg:max-w-3xl mx-auto bg-white dark:bg-slate-800">
      <svg className="animate-spin h-8 w-8 text-[#2b9dee]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  );

  if (!pet) return (
    <div className="flex flex-col items-center justify-center min-h-screen max-w-[430px] lg:max-w-3xl mx-auto bg-white dark:bg-slate-800 gap-4">
      <span className="material-symbols-outlined text-[48px] text-slate-300 dark:text-slate-600">pets</span>
      <p className="text-slate-500 dark:text-slate-400 text-sm">Mascota no encontrada</p>
      <button onClick={() => navigate("/home")} className="text-[#2b9dee] font-bold text-sm">Volver al inicio</button>
    </div>
  );

  return (
    <div className="relative flex h-auto min-h-screen w-full max-w-[430px] lg:max-w-3xl mx-auto flex-col bg-white dark:bg-slate-800 font-display text-slate-900 dark:text-white pb-10">
      <div className="relative h-72 w-full bg-slate-200 dark:bg-slate-600">
        {pet.image_url
          ? <img alt={pet.name ?? ""} className="w-full h-full object-cover" src={pet.image_url} />
          : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-[80px] text-slate-300 dark:text-slate-500">pets</span></div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-md"
        >
          <span className="material-symbols-outlined text-[22px] text-slate-800">arrow_back</span>
        </button>
        <button onClick={handleShare} className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-xl px-3 h-10 shadow-md">
          <span className="material-symbols-outlined text-[22px] text-slate-800">share</span>
          {copied && <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">¡Link copiado!</span>}
        </button>
        <div className={`absolute bottom-4 left-4 ${pet.status === "lost" ? "bg-red-600" : "bg-emerald-600"} text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider`}>
          {pet.status === "lost" ? "Perdido" : "Encontrado"}
        </div>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">{pet.name}</h1>
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm mt-1">
              <span className="material-symbols-outlined text-[16px]">location_on</span>
              <span>{pet.location}</span>
            </div>
          </div>
          {pet.reward && (
            <div className="bg-[#2b9dee]/10 dark:bg-[#2b9dee]/20 px-3 py-2 rounded-xl">
              <p className="text-[#2b9dee] font-bold text-sm">{pet.reward}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Raza", value: pet.breed },
            { label: "Edad", value: pet.age },
            { label: "Color", value: pet.color },
          ].map((info) => (
            <div key={info.label} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{info.label}</p>
              <p className="text-sm font-bold mt-0.5">{info.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Descripción</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{pet.description}</p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
          <UserAvatar
            name={pet.reporter_name ?? "Anónimo"}
            avatarData={reporterProfile?.avatar_data}
            avatarUrl={reporterProfile?.avatar_url}
            size={48}
          />
          <div className="flex-1">
            <p className="text-sm font-bold">{pet.reporter_name ?? "Anónimo"}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Reportado {formatDate(pet.created_at)}</p>
          </div>
          {!isOwner && (
            <button onClick={handleContact} className="flex size-10 items-center justify-center bg-[#2b9dee]/10 dark:bg-[#2b9dee]/20 rounded-xl">
              <span className="material-symbols-outlined text-[20px] text-[#2b9dee]">chat_bubble</span>
            </button>
          )}
        </div>

        {canSearchAI && (similarLoading || similarPets.length > 0 || similarData) && (
          <div className="flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Posibles coincidencias
              </h3>
              {similarData && !similarData.searches_exhausted && similarData.searches_remaining !== 0 && (
                <div className="flex items-center gap-2">
                  {/* Botón re-buscar */}
                  {similarData.premium_required ? (
                    <button
                      onClick={() => navigate("/premium")}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold"
                    >
                      <span className="material-symbols-outlined text-[12px]">star</span>
                      Premium
                    </button>
                  ) : similarData.fromCache ? (
                    <button
                      onClick={handleRefreshSimilar}
                      disabled={refreshing}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-semibold disabled:opacity-50"
                    >
                      <span className={`material-symbols-outlined text-[12px] ${refreshing ? "animate-spin" : ""}`}>
                        refresh
                      </span>
                      {refreshing ? "Buscando..." : "Actualizar"}
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {/* Metadata: última búsqueda + búsquedas restantes */}
            {similarData && !similarLoading && (
              <div className="flex items-center justify-between">
                {similarData.fromCache && similarData.minutesAgo !== null ? (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Última búsqueda hace{" "}
                    {similarData.minutesAgo < 60
                      ? `${similarData.minutesAgo} minuto${similarData.minutesAgo !== 1 ? "s" : ""}`
                      : `${Math.floor(similarData.minutesAgo / 60)} hora${Math.floor(similarData.minutesAgo / 60) !== 1 ? "s" : ""}`}
                  </span>
                ) : (
                  <span />
                )}
                {similarData.searches_remaining != null && similarData.searches_remaining > 0 && (
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    {similarData.searches_remaining} búsqueda{similarData.searches_remaining !== 1 ? "s" : ""} gratis restante{similarData.searches_remaining !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}

            {/* Loading */}
            {similarLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <svg className="animate-spin h-4 w-4 text-[#2b9dee]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Analizando con IA...
              </div>
            )}

            {/* Embedding pendiente: se está procesando la mascota */}
            {!similarLoading && similarData?.embedding_pending && (
              <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
                <svg className="animate-spin h-4 w-4 text-[#2b9dee] shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400">Analizando tu mascota con IA...</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-500">Tocá "Reintentar" en unos segundos.</p>
                </div>
                <button
                  onClick={handleRefreshSimilar}
                  disabled={refreshing}
                  className="shrink-0 px-3 py-1.5 bg-[#2b9dee] text-white text-xs font-bold rounded-lg disabled:opacity-50"
                >
                  {refreshing ? "..." : "Reintentar"}
                </button>
              </div>
            )}

            {/* Sin resultados (embedding listo pero sin coincidencias) */}
            {!similarLoading && similarData && !similarData.embedding_pending && similarPets.length === 0 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  No encontramos coincidencias por ahora.
                </p>
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

            {/* Cards */}
            {similarPets.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
                {similarPets.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/pet/${s.id}`)}
                    className="shrink-0 w-28 flex flex-col rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50"
                  >
                    <div className="w-full h-24 bg-slate-200 dark:bg-slate-600">
                      {s.image_url
                        ? <img src={s.image_url} alt={s.name ?? ""} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-[32px] text-slate-400">pets</span></div>
                      }
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-bold truncate">{s.name ?? "Sin nombre"}</p>
                      <p className="text-[10px] text-[#2b9dee] font-semibold mt-0.5">
                        {s.ai_score}% coincidencia
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* CTA premium cuando fue bloqueado por cache */}
            {similarData?.premium_required && !similarData?.searches_exhausted && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <span className="material-symbols-outlined text-amber-500 text-[22px]">star</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Actualizá en menos de 24hs</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-500">Con Premium podés volver a buscar cuando quieras.</p>
                </div>
                <button
                  onClick={() => navigate("/premium")}
                  className="shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg"
                >
                  Ver planes
                </button>
              </div>
            )}

            {/* CTA premium cuando se agotaron las búsquedas gratuitas */}
            {(similarData?.searches_exhausted || similarData?.searches_remaining === 0) && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <span className="material-symbols-outlined text-amber-500 text-[22px]">star</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Agotaste tus 2 búsquedas gratis</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-500">Con Premium tenés búsquedas ilimitadas con IA.</p>
                </div>
                <button
                  onClick={() => navigate("/premium")}
                  className="shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg"
                >
                  Ver planes
                </button>
              </div>
            )}
          </div>
        )}

        {!isOwner && (
          <div className="flex gap-3">
            <button
              onClick={handleContact}
              disabled={contacting}
              className="flex-1 h-14 border border-[#2b9dee] text-[#2b9dee] rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {contacting ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : (
                <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
              )}
              Contactar
            </button>
            <button className="flex-1 h-14 bg-[#2b9dee] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#2b9dee]/20 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Lo reconozco
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
