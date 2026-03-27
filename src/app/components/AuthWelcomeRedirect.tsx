import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

/** Page cible du lien magique Supabase (`emailRedirectTo: .../welcome`). Échange le code PKCE puis renvoie vers l’app. */
export function AuthWelcomeRedirect() {
  const { syncSessionFromUrl } = useAuth();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await syncSessionFromUrl();
      if (cancelled) return;
      window.location.replace(`${window.location.origin}/`);
    })();
    return () => {
      cancelled = true;
    };
  }, [syncSessionFromUrl]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <Loader2 className="w-10 h-10 text-[#2abaad] animate-spin" />
      <p className="text-sm text-gray-600">Connexion en cours…</p>
    </div>
  );
}
