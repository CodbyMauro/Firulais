import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const PLANS = {
  monthly: {
    id: "monthly",
    label: "Mensual",
    price: 4500,
    priceLabel: "$4.500",
    period: "/mes",
    saving: null,
  },
  annual: {
    id: "annual",
    label: "Anual",
    price: 38000,
    priceLabel: "$38.000",
    period: "/año",
    saving: "Ahorrás 2 meses",
  },
};

const FEATURES = [
  { icon: "psychology", text: "Búsquedas con IA ilimitadas" },
  { icon: "refresh", text: "Actualizá resultados cuando quieras" },
  { icon: "notifications_active", text: "Alertas prioritarias de coincidencias" },
  { icon: "verified", text: "Insignia Premium en tu perfil" },
  { icon: "favorite", text: "Apoyás la misión de reunir mascotas" },
];

export default function PremiumScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  const paymentStatus = searchParams.get("status");

  useEffect(() => {
    const el = document.querySelector(".firulais-premium-scroll");
    el?.scrollTo(0, 0);
  }, []);

  // Verificar si ya es premium
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_premium, premium_until")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const active =
          data.is_premium ||
          (data.premium_until && new Date(data.premium_until) > new Date());
        setIsPremium(!!active);
      });
  }, [user, paymentStatus]);

  const handleSubscribe = async () => {
    if (!user) { navigate("/login"); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ plan: selectedPlan }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear el pago");

      // Redirigir a MercadoPago
      window.location.href = data.init_point;
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="firulais-premium-route flex flex-col overflow-hidden w-full max-w-[430px] lg:max-w-3xl mx-auto bg-white dark:bg-slate-800 font-display text-slate-900 dark:text-white">
      <div className="shrink-0 flex items-center px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700"
        >
          <span className="material-symbols-outlined text-[22px]">arrow_back</span>
        </button>
      </div>

      <div className="firulais-premium-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 gap-6 pb-mobile-tab lg:pb-8">
        {paymentStatus === "approved" && (
          <div className="shrink-0 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-500 text-[28px]">check_circle</span>
            <div>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">¡Pago aprobado!</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">Tu cuenta Premium ya está activa.</p>
            </div>
          </div>
        )}
        {paymentStatus === "rejected" && (
          <div className="shrink-0 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500 text-[28px]">cancel</span>
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-400">Pago rechazado</p>
              <p className="text-xs text-red-600 dark:text-red-500">Intentá de nuevo o usá otro medio de pago.</p>
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="w-20 h-20 rounded-3xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[44px] text-amber-500">star</span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Firulais Premium</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              Usá todo el poder de la IA para encontrar a tu mascota
            </p>
          </div>

          {isPremium && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <span className="material-symbols-outlined text-[16px] text-amber-500">verified</span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">Ya sos Premium</span>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="flex flex-col gap-2.5">
          {FEATURES.map((f) => (
            <div key={f.icon} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#2b9dee]/10 dark:bg-[#2b9dee]/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px] text-[#2b9dee]">{f.icon}</span>
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-300">{f.text}</span>
            </div>
          ))}
        </div>

        {/* Selector de plan */}
        {!isPremium && (
          <>
            <div className="flex flex-col gap-3">
              {(["monthly", "annual"] as const).map((key) => {
                const plan = PLANS[key];
                const active = selectedPlan === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedPlan(key)}
                    className={`relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                      active
                        ? "border-[#2b9dee] bg-[#2b9dee]/5 dark:bg-[#2b9dee]/10"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? "border-[#2b9dee]" : "border-slate-300 dark:border-slate-600"}`}>
                        {active && <div className="w-2.5 h-2.5 rounded-full bg-[#2b9dee]" />}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">{plan.label}</p>
                        {plan.saving && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{plan.saving}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-extrabold">{plan.priceLabel}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{plan.period}</span>
                    </div>
                    {key === "annual" && (
                      <div className="absolute -top-2.5 right-4 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                        MEJOR VALOR
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full h-14 bg-[#2b9dee] text-white rounded-2xl font-bold text-base shadow-lg shadow-[#2b9dee]/25 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                ) : (
                  <span className="material-symbols-outlined text-[20px]">payment</span>
                )}
                {loading ? "Redirigiendo..." : `Suscribirse con MercadoPago`}
              </button>
              <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
                Pagá de forma segura con MercadoPago · Cancelá cuando quieras
              </p>
            </div>
          </>
        )}

        {isPremium && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full h-14 bg-[#2b9dee] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Volver
          </button>
        )}

        <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 leading-relaxed pb-2">
          Al suscribirte aceptás los Términos y Condiciones de Firulais.
          El cobro se procesa a través de MercadoPago. Podés cancelar tu suscripción en cualquier momento.
        </p>
      </div>
    </div>
  );
}
