import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Loader2, CheckCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type Step = "identite" | "email-envoye";

export function LoginScreen() {
  const { sendEmailOtp, verifyEmailOtp, syncSessionFromUrl, session } = useAuth();
  const [step, setStep] = useState<Step>("identite");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const rafraichirConnexion = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    try {
      const { session: s, error } = await syncSessionFromUrl();
      if (error) {
        setMessage(error.message);
        return;
      }
      if (s) {
        setMessage("Connexion réussie.");
        return;
      }
      setMessage(
        "Aucune session détectée. Ouvrez le lien « Log In » / « Se connecter » dans l’e-mail — de préférence dans ce navigateur — ou vérifiez que l’URL du site (Vercel) est bien autorisée dans Supabase → Authentication → URL Configuration.",
      );
    } finally {
      setBusy(false);
    }
  }, [syncSessionFromUrl]);

  useEffect(() => {
    if (step !== "email-envoye") return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void rafraichirConnexion();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [step, rafraichirConnexion]);

  const envoyerLien = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!prenom.trim() || !nom.trim()) {
      setMessage("Indiquez votre prénom et votre nom.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await sendEmailOtp(email, prenom, nom);
      if (error) {
        setMessage(error.message);
        return;
      }
      setStep("email-envoye");
      setMessage(
        "E-mail envoyé. Supabase envoie un lien magique : ouvrez le message et cliquez sur le bouton de connexion.",
      );
    } finally {
      setBusy(false);
    }
  };

  const validerCode = async (e: FormEvent) => {
    e.preventDefault();
    if (otp.replace(/\D/g, "").length < 6) return;
    setMessage(null);
    setBusy(true);
    try {
      const { error } = await verifyEmailOtp(email, otp);
      if (error) setMessage(error.message || "Code invalide ou expiré.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-100">
            <CheckCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-800">eCheck</h1>
          <p className="text-sm text-gray-500 mt-2">
            {step === "identite" ? "Connexion sans mot de passe" : "Lien magique envoyé"}
          </p>
        </div>

        {step === "identite" ? (
          <form
            onSubmit={envoyerLien}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Prénom</label>
                <input
                  type="text"
                  autoComplete="given-name"
                  required
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2abaad]/25 focus:border-[#2abaad]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nom</label>
                <input
                  type="text"
                  autoComplete="family-name"
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2abaad]/25 focus:border-[#2abaad]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">E-mail</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2abaad]/25 focus:border-[#2abaad]"
              />
            </div>

            {message && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{message}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-xl bg-[#2abaad] text-white text-sm font-semibold hover:bg-[#24a699] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Recevoir le lien par e-mail
            </button>
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              Par défaut, Supabase envoie un <strong>lien magique</strong> (comme « Magic Link »). Pour un code à 6
              chiffres à la place, activez l’OTP e-mail dans Authentication → Providers → Email.
            </p>
          </form>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              Un e-mail a été envoyé à <span className="font-medium text-gray-900">{email}</span>.
            </p>
            <div className="rounded-xl bg-teal-50 border border-teal-100 px-3 py-3 text-sm text-gray-700 space-y-2">
              <p className="font-medium text-teal-900">Étape suivante</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Ouvrez l’e-mail de Supabase (« Magic Link »).</li>
                <li>
                  Cliquez sur <strong>Log In</strong> / <strong>Se connecter</strong> — idéalement sur le même
                  appareil et le même navigateur que cette page.
                </li>
                <li>
                  Si une nouvelle fenêtre s’ouvre, revenez sur cet onglet et appuyez sur « J’ai cliqué sur le lien
                  » ci-dessous.
                </li>
              </ol>
            </div>

            {message && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{message}</p>
            )}

            {session ? (
              <p className="text-sm text-teal-700 font-medium">Vous êtes connecté. Chargement…</p>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void rafraichirConnexion()}
                className="w-full py-3 rounded-xl bg-[#2abaad] text-white text-sm font-semibold hover:bg-[#24a699] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                J’ai cliqué sur le lien — vérifier la connexion
              </button>
            )}

            <form onSubmit={validerCode} className="pt-2 border-t border-gray-100 space-y-3">
              <p className="text-xs text-gray-500">
                Si votre projet Supabase envoie un <strong>code</strong> au lieu d’un lien, saisissez-le ici :
              </p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder="Code (optionnel)"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#2abaad]/25 focus:border-[#2abaad]"
              />
              <button
                type="submit"
                disabled={busy || otp.replace(/\D/g, "").length < 6}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Valider le code (OTP)
              </button>
            </form>

            <div className="flex flex-col gap-2 text-sm pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep("identite");
                  setOtp("");
                  setMessage(null);
                }}
                className="text-[#2abaad] hover:underline text-left"
              >
                Modifier l’e-mail ou le nom
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setMessage(null);
                  setBusy(true);
                  try {
                    const { error } = await sendEmailOtp(email, prenom, nom);
                    if (error) setMessage(error.message);
                    else setMessage("Un nouvel e-mail a été envoyé.");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="text-gray-500 hover:text-gray-700 text-left"
              >
                Renvoyer l’e-mail
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
