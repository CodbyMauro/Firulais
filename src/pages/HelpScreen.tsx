import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { foldAccentsContains } from "../lib/foldAccents";
import BottomNav from "../components/BottomNav";

const FAQS = [
  {
    category: "Reportes",
    items: [
      {
        q: "¿Cómo publico un reporte de mascota perdida?",
        a: "Tocá el botón \"+\" en la pantalla principal o en la barra inferior. Completá los datos de tu mascota (nombre, raza, color, última ubicación) y subí una foto. Cuanta más información, más fácil es que alguien la reconozca.",
      },
      {
        q: "¿Puedo editar o eliminar un reporte que publiqué?",
        a: "Sí. Ingresá a \"Mis Reportes\" desde tu perfil. Desde ahí podés eliminar cualquier reporte que hayas publicado. La edición completa estará disponible próximamente.",
      },
      {
        q: "¿Qué pasa si encontré a mi mascota?",
        a: "¡Genial! Eliminá el reporte desde \"Mis Reportes\" para que deje de aparecer en los resultados. También podés compartir tu historia con la comunidad enviándonos un mensaje.",
      },
      {
        q: "¿Por qué no aparece mi reporte en el mapa?",
        a: "El reporte aparece en el mapa solo si seleccionaste una ubicación al publicarlo. Asegurate de marcar el pin en el mapa durante la carga del reporte.",
      },
    ],
  },
  {
    category: "Búsqueda con IA",
    items: [
      {
        q: "¿Cómo funciona la búsqueda con IA?",
        a: "Nuestra IA analiza la foto de tu mascota y la compara visualmente con todas las mascotas reportadas como encontradas. Usa un modelo de visión por computadora que detecta características físicas como color, forma y tamaño.",
      },
      {
        q: "¿Cuántas búsquedas con IA tengo gratis?",
        a: "Cada cuenta tiene 2 búsquedas con IA gratuitas de por vida. Con el plan Premium tenés búsquedas ilimitadas y podés actualizar los resultados cuando quieras.",
      },
      {
        q: "Los resultados de la IA no son precisos, ¿qué hago?",
        a: "La IA es una herramienta de apoyo, no infalible. Te recomendamos también revisar los reportes manualmente y contactar directamente a quienes encontraron mascotas similares en tu zona.",
      },
    ],
  },
  {
    category: "Cuenta y perfil",
    items: [
      {
        q: "¿Cómo cambio mi foto o nombre de perfil?",
        a: "Ingresá a tu perfil tocando el ícono de usuario en la esquina superior derecha, luego tocá \"Editar perfil\". Podés cambiar tu nombre, foto y avatar.",
      },
      {
        q: "Olvidé mi contraseña, ¿qué hago?",
        a: "En la pantalla de inicio de sesión, tocá \"¿Olvidaste tu contraseña?\". Te enviamos un email con un link para restablecerla. Revisá también tu carpeta de spam.",
      },
      {
        q: "¿Cómo elimino mi cuenta?",
        a: "Por el momento la eliminación de cuenta se hace de forma manual. Escribinos a soporte con el email de tu cuenta y procesamos la solicitud en 48 horas.",
      },
    ],
  },
  {
    category: "Premium",
    items: [
      {
        q: "¿Qué incluye el plan Premium?",
        a: "Búsquedas con IA ilimitadas, posibilidad de actualizar resultados cuando quieras, alertas prioritarias de coincidencias e insignia Premium en tu perfil.",
      },
      {
        q: "¿Cómo cancelo mi suscripción?",
        a: "Podés cancelar en cualquier momento desde tu cuenta de MercadoPago. Tu acceso Premium se mantiene activo hasta el final del período pagado.",
      },
      {
        q: "Pagué pero no aparece mi cuenta como Premium",
        a: "El sistema puede demorar hasta 5 minutos en procesar el pago. Si pasó más tiempo, escribinos con el número de operación de MercadoPago y lo revisamos.",
      },
    ],
  },
];

const CONTACT_OPTIONS = [
  {
    icon: "chat",
    label: "WhatsApp",
    description: "Respondemos en minutos",
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
    action: () => window.open("https://wa.me/5491100000000?text=Hola%2C%20necesito%20ayuda%20con%20Firulais", "_blank"),
  },
  {
    icon: "mail",
    label: "Email",
    description: "soporte@firulais.app",
    color: "text-[#2b9dee]",
    bg: "bg-[#2b9dee]/10 dark:bg-[#2b9dee]/20",
    border: "border-[#2b9dee]/20",
    action: () => window.open("mailto:soporte@firulais.app?subject=Ayuda%20con%20Firulais", "_blank"),
  },
  {
    icon: "photo_camera",
    label: "Instagram",
    description: "@firulaisapp",
    color: "text-pink-600",
    bg: "bg-pink-50 dark:bg-pink-900/20",
    border: "border-pink-200 dark:border-pink-800",
    action: () => window.open("https://instagram.com/firulaisapp", "_blank"),
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 dark:border-slate-700 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 py-4 text-left"
      >
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">{q}</span>
        <span className={`material-symbols-outlined text-[20px] text-slate-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          expand_more
        </span>
      </button>
      {open && (
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pb-4">
          {a}
        </p>
      )}
    </div>
  );
}

export default function HelpScreen() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportSent, setReportSent] = useState(false);

  const filtered = FAQS.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        !search.trim() ||
        foldAccentsContains(item.q, search) ||
        foldAccentsContains(item.a, search),
    ),
  })).filter((cat) => cat.items.length > 0);

  const handleSendReport = () => {
    if (!reportText.trim()) return;
    window.open(
      `mailto:soporte@firulais.app?subject=Reporte%20de%20problema&body=${encodeURIComponent(reportText)}`,
      "_blank",
    );
    setReportSent(true);
    setReportText("");
    setTimeout(() => { setReportSent(false); setReportOpen(false); }, 2500);
  };

  return (
    <div className="relative flex min-h-screen w-full max-w-[430px] lg:max-w-3xl mx-auto flex-col bg-[#f6f7f8] dark:bg-slate-900 font-display text-slate-900 dark:text-white pb-mobile-tab lg:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center p-4 pb-3 justify-between">
          <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">arrow_back_ios</span>
          </button>
          <h2 className="text-lg font-bold flex-1 text-center pr-10">Ayuda y Soporte</h2>
        </div>
        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center h-10 bg-slate-100 dark:bg-slate-700 rounded-xl px-3 gap-2">
            <span className="material-symbols-outlined text-[18px] text-slate-400">search</span>
            <input
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              placeholder="Buscar en preguntas frecuentes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <span className="material-symbols-outlined text-[16px] text-slate-400">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-5 flex flex-col gap-5">

        {/* Hero */}
        {!search && (
          <div className="bg-gradient-to-br from-[#2b9dee] to-[#1a7bbf] rounded-2xl p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[28px]">support_agent</span>
              </div>
              <div>
                <p className="font-extrabold text-base">¿En qué te ayudamos?</p>
                <p className="text-white/80 text-xs mt-0.5">Encontrá respuestas o contactanos directo</p>
              </div>
            </div>
          </div>
        )}

        {/* Contacto */}
        {!search && (
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Contacto directo</h3>
            <div className="flex flex-col gap-2">
              {CONTACT_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={opt.action}
                  className={`flex items-center gap-4 p-4 rounded-2xl border ${opt.bg} ${opt.border} text-left w-full`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-white/60 dark:bg-white/10 flex items-center justify-center shrink-0`}>
                    <span className={`material-symbols-outlined text-[22px] ${opt.color}`}>{opt.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${opt.color}`}>{opt.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{opt.description}</p>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-slate-300 dark:text-slate-600">chevron_right</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            {search ? `Resultados para "${search}"` : "Preguntas frecuentes"}
          </h3>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-10 text-slate-400 dark:text-slate-500 gap-2">
              <span className="material-symbols-outlined text-[44px]">search_off</span>
              <p className="text-sm font-medium">No encontramos respuestas para eso</p>
              <p className="text-xs">Podés contactarnos directamente</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {filtered.map((cat) => (
              <div key={cat.category} className="bg-white dark:bg-slate-800 rounded-2xl px-4 border border-slate-100 dark:border-slate-700 shadow-sm">
                <p className="text-[11px] font-bold text-[#2b9dee] uppercase tracking-wider pt-4 pb-1">{cat.category}</p>
                {cat.items.map((item) => (
                  <FaqItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Reportar problema */}
        {!search && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <button
              onClick={() => setReportOpen((v) => !v)}
              className="w-full flex items-center gap-4 p-4 text-left"
            >
              <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px] text-red-500">bug_report</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Reportar un problema</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Algo no funciona bien? Contanos</p>
              </div>
              <span className={`material-symbols-outlined text-[20px] text-slate-400 transition-transform duration-200 ${reportOpen ? "rotate-180" : ""}`}>expand_more</span>
            </button>

            {reportOpen && (
              <div className="px-4 pb-4 flex flex-col gap-3 border-t border-slate-100 dark:border-slate-700 pt-4">
                {reportSent ? (
                  <div className="flex flex-col items-center py-4 gap-2 text-emerald-600">
                    <span className="material-symbols-outlined text-[36px]">check_circle</span>
                    <p className="text-sm font-bold">¡Reporte enviado!</p>
                    <p className="text-xs text-slate-500">Gracias por ayudarnos a mejorar</p>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      placeholder="Describí qué pasó, en qué pantalla y qué estabas haciendo..."
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#2b9dee] resize-none"
                    />
                    <button
                      onClick={handleSendReport}
                      disabled={!reportText.trim()}
                      className="w-full h-11 bg-red-500 text-white rounded-xl text-sm font-bold disabled:opacity-40"
                    >
                      Enviar reporte
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!search && (
          <div className="flex flex-col items-center gap-1 pt-2 pb-2">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Firulais · Versión 1.0.0</p>
            <p className="text-[11px] text-slate-300 dark:text-slate-600">Hecho con ❤️ para las mascotas de Argentina</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
