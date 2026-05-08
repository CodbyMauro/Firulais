import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { notifications } from "../data/mockData";

const iconMap: Record<string, { icon: string; bg: string; color: string }> = {
  match: { icon: "pets", bg: "bg-[#2b9dee]/10 dark:bg-[#2b9dee]/20", color: "text-[#2b9dee]" },
  community: { icon: "people", bg: "bg-emerald-50 dark:bg-emerald-900/20", color: "text-emerald-600" },
  success: { icon: "favorite", bg: "bg-red-50 dark:bg-red-900/20", color: "text-red-500" },
};

export default function NotificationsScreen() {
  const navigate = useNavigate();

  return (
    <div className="relative flex h-auto min-h-screen w-full max-w-[430px] lg:max-w-3xl mx-auto flex-col bg-[#f6f7f8] dark:bg-slate-900 font-display text-slate-900 dark:text-white pb-mobile-tab lg:pb-8">
      <div className="flex items-center p-4 pb-2 justify-between bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center">
          <span className="material-symbols-outlined text-[24px]">arrow_back_ios</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center pr-10">Notificaciones</h2>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">HOY</h3>
          <button className="text-[#2b9dee] text-xs font-bold">Marcar todo leído</button>
        </div>

        {notifications.map((notif) => {
          const style = iconMap[notif.type];
          return (
            <div
              key={notif.id}
              className={`flex gap-4 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm dark:shadow-slate-900/50 border ${notif.read ? "border-slate-100 dark:border-slate-700" : "border-[#2b9dee]/20"}`}
            >
              <div className={`w-12 h-12 ${style.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <span className={`material-symbols-outlined text-[22px] ${style.color}`}>{style.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold leading-tight">{notif.title}</p>
                  {!notif.read && <div className="w-2 h-2 bg-[#2b9dee] rounded-full shrink-0 mt-1"></div>}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{notif.message}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">hace {notif.timeAgo}</p>
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
