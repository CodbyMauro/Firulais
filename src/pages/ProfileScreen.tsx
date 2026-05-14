import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { useMenu } from "../context/MenuContext";
import { useAuth } from "../context/AuthContext";
import { fetchProfile, upsertProfile, type Profile } from "../lib/profileService";
import { supabase } from "../lib/supabase";

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { openMenu } = useMenu();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reportCount, setReportCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("pets")
      .select("*", { count: "exact", head: true })
      .eq("reporter_id", user.id)
      .then(({ count }) => setReportCount(count ?? 0));
    fetchProfile(user.id).then((p) => {
      if (p) {
        setProfile(p);
      } else {
        const fallbackName =
          (user as { user_metadata?: { full_name?: string; name?: string } })
            .user_metadata?.full_name ??
          (user as { user_metadata?: { full_name?: string; name?: string } })
            .user_metadata?.name ??
          user.email?.split("@")[0] ??
          "";
        upsertProfile(user.id, { full_name: fallbackName }).then(setProfile);
      }
    });
  }, [user]);

  const displayName = profile?.full_name ?? user?.email?.split("@")[0] ?? "Usuario";
  const email = user?.email ?? "";
  const initials = displayName
    .split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  const menuItems = [
    { icon: "history",       label: "Mis reportes",   desc: "Ver todos tus reportes",     action: () => navigate("/my-reports") },
    { icon: "notifications", label: "Notificaciones",  desc: "Alertas y avisos",            action: () => navigate("/notifications") },
  ];

  const settingsItems = [
    { icon: "settings",      label: "Configuración",  desc: "Preferencias de la app",      action: () => navigate("/settings") },
  ];

  return (
    <div className="relative flex min-h-screen w-full max-w-[430px] lg:max-w-2xl mx-auto flex-col bg-[#f6f7f8] dark:bg-slate-900 font-display text-slate-900 dark:text-white pb-mobile-tab lg:pb-8">

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Perfil</p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/edit-profile")}
              className="flex size-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-600 dark:text-slate-300">edit</span>
            </button>
            <button
              onClick={openMenu}
              className="flex size-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-600 dark:text-slate-300">menu</span>
            </button>
          </div>
        </div>

        {/* Avatar + info */}
        <div className="flex flex-col items-center px-4 pt-2 pb-6">
          <div className="w-24 h-24 rounded-full bg-[#2b9dee]/10 dark:bg-[#2b9dee]/20 ring-4 ring-[#2b9dee]/20 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
            {(profile?.avatar_data ?? profile?.avatar_url) ? (
              <img src={profile.avatar_data ?? profile.avatar_url!} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-[#2b9dee]">{initials}</span>
            )}
          </div>

          <h2 className="mt-4 text-xl font-bold text-center">{displayName}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-0.5">{email}</p>

          {profile?.city && (
            <div className="flex items-center gap-1.5 mt-2.5 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-[13px] text-[#2b9dee]" style={{ fontVariationSettings: "'FILL' 1" }}>
                location_on
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{profile.city}</span>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 w-full mt-5">
            <div className="flex flex-col items-center bg-[#2b9dee]/10 dark:bg-[#2b9dee]/20 rounded-2xl py-4">
              <p className="text-2xl font-bold text-[#2b9dee]">{reportCount ?? "—"}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Reportes</p>
            </div>
            <div className="flex flex-col items-center bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl py-4">
              <p className="text-2xl font-bold text-emerald-500">—</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Rescatados</p>
            </div>
            <div className="flex flex-col items-center bg-amber-50 dark:bg-amber-900/20 rounded-2xl py-4">
              <p className="text-2xl font-bold text-amber-500">—</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Ayudas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Menú actividad */}
      <div className="flex flex-col gap-6 px-4 mt-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1 mb-3">
            Actividad
          </p>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            {menuItems.map((item, idx) => (
              <button
                key={idx}
                onClick={item.action}
                className="flex items-center gap-3 px-4 py-4 w-full text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0 cursor-pointer"
              >
                <div className="w-9 h-9 bg-[#2b9dee]/10 dark:bg-[#2b9dee]/20 rounded-xl flex items-center justify-center shrink-0">
                  <span
                    className="material-symbols-outlined text-[20px] text-[#2b9dee]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {item.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{item.desc}</p>
                </div>
                <span className="material-symbols-outlined text-[18px] text-slate-300 dark:text-slate-600">
                  chevron_right
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Configuración */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1 mb-3">
            General
          </p>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            {settingsItems.map((item, idx) => (
              <button
                key={idx}
                onClick={item.action}
                className="flex items-center gap-3 px-4 py-4 w-full text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px] text-slate-500 dark:text-slate-400">
                    {item.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{item.desc}</p>
                </div>
                <span className="material-symbols-outlined text-[18px] text-slate-300 dark:text-slate-600">
                  chevron_right
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
