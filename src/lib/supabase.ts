import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function isPlaceholderSupabaseUrl(value: string): boolean {
  const v = value.trim().toLowerCase();
  return (
    v.includes("tu-proyecto.supabase.co") ||
    v.includes("your-project.supabase.co") ||
    /\/\/[^/]*example[^/]*\.supabase\.co/.test(v)
  );
}

function isPlaceholderAnonKey(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v.includes("paste_aqui") || v.includes("your-anon-key") || v === "anon";
}

if (!url?.trim() || !key?.trim()) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Revisá .env, .env.development y .env.local (Supabase → Settings → API → anon public).",
  );
}

if (isPlaceholderSupabaseUrl(url) || isPlaceholderAnonKey(key)) {
  throw new Error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env.development siguen siendo texto de ejemplo (p. ej. TU-PROYECTO o PASTE_AQUI). Reemplazalos por la URL del proyecto y la anon key (Supabase → Project Settings → API).",
  );
}

export const supabase = createClient(url, key, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});
