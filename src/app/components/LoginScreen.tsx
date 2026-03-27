import { useState, type FormEvent } from "react";
import { Loader2, CheckCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type Step = "identite" | "code";

export function LoginScreen() {
  const { sendEmailOtp, verifyEmailOtp } = useAuth();
  const [step, setStep] = useState<Step>("identite");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const envoyerCode = async (e: FormEvent) => {
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
      setStep("code");
      setMessage("Un code vous a été envoyé par e-mail. Saisissez-le ci-dessous.");
    } finally {
      setBusy(false);
    }
  };

  const validerCode = async (e: FormEvent) => {
    e.preventDefault();
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
            {step === "identite" ? "Connexion par code (OTP)" : "Vérification du code"}
          </p>
        </div>

        {step === "identite" ? (
          <form
            onSubmit={envoyerCode}
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
              Recevoir le code
            </button>
            <p className="text-xs text-gray-400 text-center">
              Activez « OTP par e-mail » dans Supabase : Authentication → Providers → Email.
            </p>
          </form>
        ) : (
          <form
            onSubmit={validerCode}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4"
          >
            <p className="text-sm text-gray-600">
              Code envoyé à <span className="font-medium text-gray-800">{email}</span>
            </p>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Code à 6 chiffres</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={8}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-mono text-lg tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-[#2abaad]/25 focus:border-[#2abaad]"
              />
            </div>

            {message && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{message}</p>
            )}

            <button
              type="submit"
              disabled={busy || otp.replace(/\D/g, "").length < 6}
              className="w-full py-3 rounded-xl bg-[#2abaad] text-white text-sm font-semibold hover:bg-[#24a699] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Valider et se connecter
            </button>

            <div className="flex flex-col gap-2 text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep("identite");
                  setOtp("");
                  setMessage(null);
                }}
                className="text-[#2abaad] hover:underline"
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
                    else setMessage("Un nouveau code a été envoyé.");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                Renvoyer le code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
