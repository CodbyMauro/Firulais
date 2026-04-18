import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { setupPushNotifications } from "../lib/notifications";
import type { Session } from "@supabase/supabase-js";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  oauthLoading: "google" | "apple" | null;
  error: string | null;
  pendingEmail: string | null;
  register: (name: string, email: string, password: string) => Promise<void>;
  resendConfirmation: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  clearPendingEmail: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function sessionToUser(session: Session): User {
  return {
    id:    session.user.id,
    email: session.user.email ?? "",
    name:  session.user.user_metadata?.full_name ?? session.user.email?.split("@")[0] ?? "",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<User | null>(null);
  const [session, setSession]     = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  // Restaurar sesión activa al cargar la app
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
        setUser(sessionToUser(data.session));
      }
      setIsLoading(false);
    });

    // Escuchar cambios de sesión (login, logout, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession ? sessionToUser(newSession) : null);
      // Pedir permiso de notificaciones al iniciar sesión
      if (event === "SIGNED_IN" && newSession) {
        setupPushNotifications(newSession.user.id);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
    } catch (e: unknown) {
      const msg = mapError(e);
      // Si el error es por email no confirmado, llevar al usuario a la pantalla de confirmación
      if (msg.includes("Confirmá tu correo")) setPendingEmail(email);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (err) throw err;
      // Si hay usuario pero no sesión, Supabase requiere confirmación de email
      if (data.user && !data.session) {
        setPendingEmail(email);
      }
    } catch (e: unknown) {
      setError(mapError(e));
    } finally {
      setIsLoading(false);
    }
  };

  const resendConfirmation = async () => {
    if (!pendingEmail) return;
    setError(null);
    const { error: err } = await supabase.auth.resend({ type: "signup", email: pendingEmail });
    if (err) setError(mapError(err));
  };

  const loginWithGoogle = async () => {
    setOauthLoading("google");
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) { setError(mapError(err)); setOauthLoading(null); }
  };

  const loginWithApple = async () => {
    setOauthLoading("apple");
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) { setError(mapError(err)); setOauthLoading(null); }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const clearError = () => setError(null);
  const clearPendingEmail = () => setPendingEmail(null);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, oauthLoading, error, pendingEmail, register, resendConfirmation, login, loginWithGoogle, loginWithApple, logout, clearError, clearPendingEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}

// Traduce errores de Supabase a español
function mapError(e: unknown): string {
  if (!(e instanceof Error)) return "Error inesperado";
  const msg = e.message.toLowerCase();
  if (msg.includes("failed to fetch") || msg.includes("networkerror"))
    return "No se pudo conectar con el servidor (¿Supabase local con `supabase start`, o URL/clave en .env?)";
  if (msg.includes("invalid api key"))
    return "Clave de API inválida: revisá VITE_SUPABASE_ANON_KEY en .env.local (Supabase → Settings → API).";
  if (msg.includes("invalid login credentials"))   return "Correo o contraseña incorrectos";
  if (msg.includes("email not confirmed"))          return "Confirmá tu correo antes de iniciar sesión";
  if (msg.includes("user already registered"))      return "Ya existe una cuenta con ese correo";
  if (msg.includes("password should be at least"))  return "La contraseña debe tener al menos 6 caracteres";
  if (msg.includes("unable to validate"))           return "Correo no válido";
  return e.message;
}
