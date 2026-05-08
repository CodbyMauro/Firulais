import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { fetchHappyEndings, type HappyEnding } from "../lib/adminService";

export default function HappyEndingsScreen() {
  const navigate = useNavigate();
  const [stories, setStories] = useState<HappyEnding[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHappyEndings()
      .then((data) => setStories(data.filter((s) => s.is_active)))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="relative flex h-auto min-h-screen w-full max-w-[430px] lg:max-w-3xl mx-auto flex-col bg-[#f6f7f8] dark:bg-slate-900 font-display text-slate-900 dark:text-white pb-mobile-tab lg:pb-8">
      <div className="flex items-center p-4 pb-2 justify-between bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center">
          <span className="material-symbols-outlined text-[24px]">arrow_back_ios</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center pr-10">Finales Felices</h2>
      </div>

      <div className="px-4 py-5">
        <div className="bg-gradient-to-r from-[#2b9dee] to-[#1a7bbf] rounded-2xl p-5 text-white text-center mb-5">
          <span className="material-symbols-outlined text-[40px] mb-2 block">favorite</span>
          <h3 className="text-xl font-extrabold">¡Gracias a la comunidad!</h3>
          <p className="text-sm text-white/80 mt-1">
            Mascotas reunidas con sus familias gracias a Firulais
          </p>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-[#2b9dee]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
        )}

        {!isLoading && stories.length === 0 && (
          <div className="flex flex-col items-center py-16 text-slate-400 dark:text-slate-500 gap-3">
            <span className="material-symbols-outlined text-[52px]">celebration</span>
            <p className="text-sm font-medium">Todavía no hay historias publicadas</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {stories.map((story) => (
            <div key={story.id} className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50">
              <div className="relative h-44 w-full bg-slate-200 dark:bg-slate-600">
                {story.image_url
                  ? <img alt={story.pet_name} className="w-full h-full object-cover" src={story.image_url} />
                  : <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-[48px] text-slate-300 dark:text-slate-500">favorite</span>
                    </div>
                }
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                      ¡Reunido!
                    </div>
                    {story.days_lost != null && (
                      <span className="text-white text-xs font-medium">{story.days_lost} días desaparecido</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-base font-bold">{story.pet_name}</h3>
                {story.breed && <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{story.breed}</p>}
                {story.story && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{story.story}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
