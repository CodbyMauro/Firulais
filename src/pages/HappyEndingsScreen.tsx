import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { countReunitedPets, fetchReunitedPets, type Pet } from "../lib/petsService";

const REUNITED_WINDOWS = [7, 14, 30] as const;
const MAX_REUNITED_STORIES = 20;

function daysUntilReunited(pet: Pet): number | null {
  if (!pet.reunited_at) return null;
  const created = new Date(pet.created_at).getTime();
  const reunited = new Date(pet.reunited_at).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(reunited)) return null;
  return Math.max(0, Math.ceil((reunited - created) / 86400000));
}

function getPetTitle(pet: Pet): string {
  if (pet.status === "lost") return pet.name?.trim() || "Mascota reunida";
  return pet.breed?.trim() || "Mascota reunida";
}

function getWindowLabel(days: number): string {
  if (days === 7) return "últimos 7 días";
  if (days === 14) return "últimas 2 semanas";
  return "último mes";
}

function FamilyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
      <path
        d="M12 11.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.25 20.25c.48-4.05 2.55-6.2 5.75-6.2s5.27 2.15 5.75 6.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.75 10.75a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4ZM18.25 10.75a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <path
        d="M2.75 18.75c.35-3.05 1.85-4.8 4.1-5M21.25 18.75c-.35-3.05-1.85-4.8-4.1-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}

export default function HappyEndingsScreen() {
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [totalReunited, setTotalReunited] = useState(0);
  const [windowDays, setWindowDays] = useState<number>(7);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadReunitedPets() {
      try {
        const totalPromise = countReunitedPets();
        for (const days of REUNITED_WINDOWS) {
          const data = await fetchReunitedPets({ days, limit: MAX_REUNITED_STORIES });
          if (data.length > 0 || days === REUNITED_WINDOWS[REUNITED_WINDOWS.length - 1]) {
            if (!cancelled) {
              setPets(data);
              setWindowDays(days);
            }
            break;
          }
        }
        const total = await totalPromise;
        if (!cancelled) setTotalReunited(total);
      } catch {
        if (!cancelled) setPets([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadReunitedPets();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative flex h-auto min-h-screen w-full max-w-[430px] lg:max-w-3xl mx-auto flex-col bg-[#f6f7f8] dark:bg-slate-900 font-display text-slate-900 dark:text-white pb-mobile-tab lg:pb-8">
      <div className="flex items-center p-4 pb-2 justify-between bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center">
          <span className="material-symbols-outlined text-[24px]">arrow_back_ios</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center pr-10">Finales felices</h2>
      </div>

      <div className="px-4 py-5">
        <div className=" rounded-2xl bg-gradient-to-r from-[#2b9dee] to-[#1a7bbf] p-5 text-white shadow-sm mb-4">
          <div className="flex items-start gap-4">
            <div className="text-center min-w-0 flex-1">
              <h3 className="text-xl font-extrabold leading-tight">¡Gracias a la comunidad!</h3>
              <p className="mt-1 text-sm leading-5 text-white/85">
                Cada final feliz acerca otra mascota a casa.
              </p>
            </div>
          </div>
          {!isLoading && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[#1a7bbf]">
                <FamilyIcon />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold">
                  {totalReunited === 1
                    ? "1 mascota volvió con su familia"
                    : `${totalReunited} mascotas volvieron con sus familias`}
                </p>
              </div>
            </div>
          )}
        </div>

        {!isLoading && (
          <div className="mb-4 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#2b9dee]">calendar_month</span>
              <p className="text-xs font-bold">
                Mostrando finales felices de los {getWindowLabel(windowDays)}.
              </p>
            </div>
            {windowDays > 7 && (
              <p className="mt-1 pl-6 text-[11px] leading-4 text-slate-400 dark:text-slate-500">
                No hubo mascotas reunidas en la última semana, por eso ampliamos el rango.
              </p>
            )}
          </div>
        )}

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
            <span className="material-symbols-outlined text-[52px]">celebration</span>
            <p className="text-sm font-medium">No hay mascotas reunidas en el último mes</p>
            <p className="max-w-[260px] text-center text-xs leading-5">
              Esta pantalla muestra casos recientes; puede haber finales felices más antiguos.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {pets.map((pet) => {
            const days = daysUntilReunited(pet);
            const title = getPetTitle(pet);
            return (
            <button
              key={pet.id}
              type="button"
              onClick={() => navigate(`/pet/${pet.id}`)}
              className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition-transform active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50"
            >
              <div className="relative aspect-square w-full bg-slate-200 dark:bg-slate-600">
                {pet.image_url
                  ? <img alt={title} className="w-full h-full object-cover" src={pet.image_url} />
                  : <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-[48px] text-slate-300 dark:text-slate-500">favorite</span>
                    </div>
                }
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  ¡Reunido!
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                    {days != null && (
                      <span className="inline-flex rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                        {days === 0 ? "Mismo día" : `${days} día${days !== 1 ? "s" : ""}`}
                      </span>
                    )}
                </div>
              </div>
              <div className="p-2.5">
                <h3 className="truncate text-[13px] font-extrabold leading-tight">{title}</h3>
                {pet.breed && <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">{pet.breed}</p>}
              </div>
            </button>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
