import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchMyPets, deletePet, reactivatePet, type Pet } from "../lib/petsService";
import { fetchProfile, type Profile } from "../lib/profileService";
import UserAvatar from "../components/UserAvatar";
import BottomNav from "../components/BottomNav";

export default function MyReportsScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pets, setPets] = useState<Pet[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchMyPets(user.id),
      fetchProfile(user.id),
    ]).then(([pets, profile]) => {
      setPets(pets);
      setMyProfile(profile);
    }).finally(() => setIsLoading(false));
  }, [user]);

  const handleDelete = async () => {
    if (!confirmId) return;
    setIsDeleting(true);
    try {
      await deletePet(confirmId);
      setPets((prev) => prev.filter((p) => p.id !== confirmId));
    } finally {
      setIsDeleting(false);
      setConfirmId(null);
    }
  };

  const formatDate = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return "ahora";
    if (diff < 60) return `hace ${diff}m`;
    if (diff < 1440) return `hace ${Math.floor(diff / 60)}h`;
    return `hace ${Math.floor(diff / 1440)}d`;
  };

  const petToDelete = pets.find((p) => p.id === confirmId);

  const isActive = (pet: Pet): boolean => {
    if (!pet.active_until) return false;
    return new Date(pet.active_until).getTime() > Date.now();
  };

  const daysRemaining = (activeUntil: string | null): number => {
    if (!activeUntil) return 0;
    return Math.ceil((new Date(activeUntil).getTime() - Date.now()) / 86400000);
  };

  const handleReactivate = async (id: string) => {
    setReactivatingId(id);
    try {
      await reactivatePet(id);
      const activeUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      setPets((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active_until: activeUntil } : p))
      );
    } catch {
      alert("No se pudo reactivar el reporte. Intentá de nuevo.");
    } finally {
      setReactivatingId(null);
    }
  };

  const renderPetCard = (pet: Pet, active: boolean) => {
    const days = daysRemaining(pet.active_until);
    const nearExpiry = active && days <= 3;

    return (
      <div
        key={pet.id}
        className={`bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50 ${!active ? "opacity-60" : ""}`}
      >
        <div
          className="flex gap-3 p-3 cursor-pointer"
          onClick={() => navigate(`/pet/${pet.id}`)}
        >
          <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0">
            {pet.image_url
              ? <img src={pet.image_url} alt={pet.name ?? ""} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-slate-500">pets</span>
                </div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {active ? (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${pet.status === "lost" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
                  {pet.status === "lost" ? "Perdido" : "Encontrado"}
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                  Desactivada
                </span>
              )}
            </div>
            <h3 className="font-bold text-base mt-1 truncate">
              {pet.status === "lost" ? (pet.name ?? "Sin nombre") : (pet.breed ?? "Sin raza")}
            </h3>
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              <span className="material-symbols-outlined shrink-0" style={{ fontSize: 18, width: 18, height: 18, lineHeight: 1 }}>location_on</span>
              <span className="truncate">{pet.location}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <UserAvatar
                name={myProfile?.full_name ?? user?.email ?? ""}
                avatarData={myProfile?.avatar_data}
                avatarUrl={myProfile?.avatar_url}
                size={18}
              />
              <p className="text-xs text-slate-400 dark:text-slate-500">{formatDate(pet.created_at)}</p>
            </div>
            {active && (
              <p className={`text-[10px] font-semibold mt-1 ${nearExpiry ? "text-amber-500" : "text-slate-400 dark:text-slate-500"}`}>
                Activa · vence en {days} día{days !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-700 flex">
          <button
            onClick={() => navigate(`/pet/${pet.id}`)}
            className="flex-1 py-3 text-xs font-semibold text-[#2b9dee] flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            Ver detalle
          </button>
          <div className="w-px bg-slate-100 dark:bg-slate-700" />
          {active ? (
            <button
              onClick={() => setConfirmId(pet.id)}
              className="flex-1 py-3 text-xs font-semibold text-red-500 flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Eliminar
            </button>
          ) : (
            <button
              onClick={() => handleReactivate(pet.id)}
              disabled={reactivatingId === pet.id}
              className="flex-1 py-3 text-xs font-semibold text-emerald-600 flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {reactivatingId === pet.id ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : (
                <span className="material-symbols-outlined text-[16px]">refresh</span>
              )}
              Reactivar
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex min-h-screen w-full max-w-[430px] lg:max-w-3xl mx-auto flex-col bg-[#f6f7f8] dark:bg-slate-900 font-display text-slate-900 dark:text-white pb-mobile-tab lg:pb-8">
      {/* Header */}
      <div className="flex items-center p-4 pb-2 justify-between bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center">
          <span className="material-symbols-outlined text-[24px]">arrow_back_ios</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center pr-10">Mis Reportes</h2>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {isLoading && (
          <div className="flex justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-[#2b9dee]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
        )}

        {!isLoading && pets.length === 0 && (
          <div className="flex flex-col items-center py-16 text-slate-400 dark:text-slate-500 gap-3">
            <span className="material-symbols-outlined text-[52px]">pets</span>
            <p className="text-sm font-medium">No publicaste ningún reporte aún</p>
            <button
              onClick={() => navigate("/report")}
              className="mt-2 px-5 py-2.5 bg-[#2b9dee] text-white text-sm font-bold rounded-xl"
            >
              Crear reporte
            </button>
          </div>
        )}

        {(() => {
          const activePets = pets.filter(isActive);
          const inactivePets = pets.filter((p) => !isActive(p));
          return (
            <>
              {activePets.map((pet) => renderPetCard(pet, true))}
              {inactivePets.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Desactivadas
                    </span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  </div>
                  {inactivePets.map((pet) => renderPetCard(pet, false))}
                </>
              )}
            </>
          );
        })()}
      </div>

      {/* Confirmation dialog */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => !isDeleting && setConfirmId(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl dark:shadow-slate-900/50">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[30px] text-red-500">delete_forever</span>
              </div>
              <h3 className="text-lg font-bold">¿Eliminar reporte?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Vas a eliminar el reporte de <span className="font-semibold text-slate-700 dark:text-slate-300">{petToDelete?.status === "lost" ? (petToDelete?.name ?? "esta mascota") : "esta mascota encontrada"}</span>. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirmId(null)}
                disabled={isDeleting}
                className="flex-1 h-12 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 h-12 rounded-xl bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isDeleting ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                )}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
