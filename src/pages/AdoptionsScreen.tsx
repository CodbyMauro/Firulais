import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { fetchAdoptions, type Adoption } from "../lib/adminService";
import { MOCK_ADOPTIONS } from "../data/mockAdoptions";

/** Pasar a `false` para cargar desde Supabase (`adoptions`). */
const USE_MOCK_ADOPTIONS = true;

export default function AdoptionsScreen() {
  const navigate = useNavigate();
  const [pets, setPets] = useState<Adoption[]>(() => (USE_MOCK_ADOPTIONS ? MOCK_ADOPTIONS : []));
  const [isLoading, setIsLoading] = useState(!USE_MOCK_ADOPTIONS);

  useEffect(() => {
    if (USE_MOCK_ADOPTIONS) return;

    fetchAdoptions()
      .then((data) => setPets(data.filter((p) => p.is_active)))
      .finally(() => setIsLoading(false));
  }, []);

  const showCenteredPlaceholder = isLoading || pets.length === 0;

  return (
    <div className="relative flex min-h-screen w-full max-w-[430px] lg:max-w-3xl mx-auto flex-col bg-[#f6f7f8] dark:bg-slate-900 font-display text-slate-900 dark:text-white pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-center p-4 pb-2 justify-between bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center">
          <span className="material-symbols-outlined text-[24px]">arrow_back_ios</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center pr-10">Adopciones</h2>
      </div>

      <div
        className={`flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 ${
          showCenteredPlaceholder ? "justify-center" : ""
        }`}
      >
        {isLoading && (
          <div className="flex justify-center">
            <svg className="animate-spin h-8 w-8 text-[#2b9dee]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
        )}

        {!isLoading && pets.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-4 text-center text-slate-400 dark:text-slate-500">
            <span className="material-symbols-outlined text-[52px]">favorite</span>
            <p className="text-sm font-medium">No hay mascotas en adopción por ahora</p>
          </div>
        )}

        {pets.map((pet) => (
          <div key={pet.id} className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50">
            <div className="relative w-full aspect-[4/3] bg-slate-200 dark:bg-slate-600">
              {pet.image_url
                ? <img src={pet.image_url} alt={pet.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-[48px] text-slate-300 dark:text-slate-500">pets</span>
                  </div>
              }
            </div>

            <div className="p-4 flex flex-col gap-1">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold">{pet.name}{pet.age ? `, ${pet.age}` : ""}</h3>
                {pet.gender && (
                  <span className={`font-bold text-base ${pet.gender === "Hembra" ? "text-pink-500" : "text-[#2b9dee]"}`}>
                    {pet.gender}
                  </span>
                )}
              </div>
              {pet.description && (
                <p className="text-slate-500 dark:text-slate-400 text-sm">{pet.description}</p>
              )}
              {(pet.shelter || pet.location) && (
                <div className="flex items-center gap-1 mt-1 text-slate-400 dark:text-slate-500 text-xs">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  {[pet.shelter, pet.location].filter(Boolean).join(" · ")}
                </div>
              )}
              <div className="flex gap-3 mt-4">
                {pet.contact_url ? (
                  <a
                    href={pet.contact_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-11 bg-[#2b9dee] text-white rounded-xl font-bold text-sm shadow-md shadow-[#2b9dee]/20 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">pets</span>
                    Adoptar
                  </a>
                ) : (
                  <button className="flex-1 h-11 bg-[#2b9dee] text-white rounded-xl font-bold text-sm shadow-md shadow-[#2b9dee]/20 flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">pets</span>
                    Adoptar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
