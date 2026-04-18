import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { fetchStoreItems, type StoreItem } from "../lib/adminService";
import { MOCK_STORE_ITEMS } from "../data/mockStoreItems";

/** Pasar a `false` para cargar desde Supabase (`store_items`). */
const USE_MOCK_STORE = true;

export default function StoreScreen() {
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<StoreItem[]>(() => (USE_MOCK_STORE ? MOCK_STORE_ITEMS : []));
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [isLoading, setIsLoading] = useState(!USE_MOCK_STORE);

  useEffect(() => {
    if (USE_MOCK_STORE) return;

    fetchStoreItems()
      .then((data) => setAllItems(data.filter((i) => i.is_active)))
      .finally(() => setIsLoading(false));
  }, []);

  const categories = ["Todos", ...Array.from(new Set(allItems.map((i) => i.category).filter(Boolean) as string[]))];
  const filtered = activeCategory === "Todos" ? allItems : allItems.filter((i) => i.category === activeCategory);

  const showCenteredPlaceholder = isLoading || filtered.length === 0;

  return (
    <div className="relative flex min-h-screen w-full max-w-[430px] lg:max-w-3xl mx-auto flex-col bg-[#f6f7f8] dark:bg-slate-900 font-display text-slate-900 dark:text-white pb-24 lg:pb-8">
      {/* Cabecera + pills: un solo bloque y un solo borde inferior (evita línea entre título y pills) */}
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between p-4 pb-2">
          <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">arrow_back_ios</span>
          </button>
          <h2 className="min-w-0 flex-1 pr-10 text-center text-lg font-bold">Tienda firulais</h2>
        </div>
        {!isLoading && categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-4 [&::-webkit-scrollbar]:hidden">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`flex h-9 shrink-0 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors ${
                  activeCategory === cat
                    ? "bg-[#2b9dee] text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 px-4 pb-4 pt-4">
        {/* Impact banner */}
        <div className="shrink-0 rounded-2xl border border-[#2b9dee]/20 bg-[#2b9dee]/10 p-5 dark:bg-[#2b9dee]/20">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#2b9dee]">
            <span className="material-symbols-outlined text-sm">volunteer_activism</span>
            Impacto Social
          </div>
          <p className="text-base font-bold leading-tight text-slate-900 dark:text-white">Tu compra ayuda</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Donamos el <span className="font-bold text-[#2b9dee]">5% de cada venta</span> a refugios locales de animales sin hogar.
          </p>
        </div>

        <div
          className={`flex min-h-0 flex-1 flex-col gap-4 ${showCenteredPlaceholder ? "justify-center" : ""}`}
        >
          {isLoading && (
            <div className="flex justify-center">
              <svg className="h-8 w-8 animate-spin text-[#2b9dee]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-4 text-center text-slate-400 dark:text-slate-500">
              <span className="material-symbols-outlined text-[52px]">storefront</span>
              <p className="text-sm font-medium">No hay productos disponibles por ahora</p>
            </div>
          )}

          {/* Product grid */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
            {filtered.map((product) => (
              <div key={product.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm dark:shadow-slate-900/50">
                <div className="aspect-square w-full bg-slate-200 dark:bg-slate-600 relative overflow-hidden">
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-[40px] text-slate-300 dark:text-slate-500">storefront</span>
                      </div>
                  }
                </div>
                <div className="p-3">
                  {product.category && (
                    <p className="text-[10px] font-bold text-[#2b9dee] uppercase">{product.category}</p>
                  )}
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 line-clamp-1">{product.name}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-extrabold text-[#2b9dee]">{product.price_label ?? ""}</span>
                    {product.link_url ? (
                      <a
                        href={product.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-xl bg-[#2b9dee] text-white flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      </a>
                    ) : (
                      <button className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
