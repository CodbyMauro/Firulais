import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

export default function SettingsScreen() {
  const navigate = useNavigate();
  useTheme();

  return (
    <div className="relative flex min-h-screen w-full max-w-[430px] lg:max-w-2xl mx-auto flex-col bg-[#f6f7f8] dark:bg-slate-900 font-display text-slate-900 dark:text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center p-4 pb-2 justify-between">
          <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">arrow_back_ios</span>
          </button>
          <h2 className="text-lg font-bold flex-1 text-center pr-10">Configuración</h2>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {/* Apariencia - dark mode toggle temporarily disabled */}
        {/* <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Apariencia</p>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#2b9dee]/10 dark:bg-[#2b9dee]/20 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px] text-[#2b9dee]">
                  {theme === "dark" ? "dark_mode" : "light_mode"}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold">Modo oscuro</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {theme === "dark" ? "Activado" : "Desactivado"}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                theme === "dark" ? "bg-[#2b9dee]" : "bg-slate-200 dark:bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  theme === "dark" ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div> */}
      </div>
    </div>
  );
}
