import { useState } from "react";
import { Loader2 } from "lucide-react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { useAuth } from "../context/AuthContext";
import { SERVER_URL } from "../services/checklistService";

type Preview = {
  valid: boolean;
  siteLocations?: { id: string; label: string }[];
  teams?: { id: string; name: string }[];
  shifts?: { id: string; name: string }[];
};

const EDGE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d5ac9b81`;

export function OnboardingScreen() {
  const { session, refreshMe, supabase } = useAuth();
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [siteLocationId, setSiteLocationId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = session?.access_token;

  const fetchWithFallback = async (path: string, init?: RequestInit) => {
    try {
      return await fetch(`${SERVER_URL}${path}`, init);
    } catch (firstError) {
      // If a custom absolute API base is unreachable, retry against Supabase Edge.
      if (SERVER_URL !== EDGE_URL) {
        console.warn("Primary onboarding API unreachable, retrying Edge URL", firstError);
        return await fetch(`${EDGE_URL}${path}`, init);
      }
      throw firstError;
    }
  };

  const lookupInvite = async () => {
    setError(null);
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setError("Enter an invite code");
      return;
    }
    try {
      const path = `/invite-preview?code=${encodeURIComponent(code)}`;
      const res = await fetchWithFallback(path).then(async (r) => ({
        ok: r.ok,
        status: r.status,
        json: () => r.json(),
      }));
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setPreview(null);
        setError("Invalid invite code");
        return;
      }
      setPreview(data);
      const locs = data.siteLocations ?? [];
      const teams = data.teams ?? [];
      const shifts = data.shifts ?? [];
      setSiteLocationId(locs[0]?.id ?? "");
      setTeamId(teams[0]?.id ?? "");
      setShiftId(shifts[0]?.id ?? "");
    } catch {
      setError("Could not verify code");
    }
  };

  const submit = async () => {
    if (!token) {
      setError("Session expired. Please sign in again.");
      return;
    }
    if (!displayName.trim()) {
      setError("Please enter your name");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body =
        mode === "create"
          ? { mode: "create", displayName: displayName.trim() }
          : {
              mode: "join",
              inviteCode: inviteCode.trim().toUpperCase(),
              displayName: displayName.trim(),
              siteLocationId,
              teamId,
              shiftId,
            };
      const postOnboarding = async (jwt: string) =>
        fetchWithFallback("/auth/onboarding", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
            apikey: publicAnonKey,
          },
          body: JSON.stringify(body),
        }).then(async (r) => ({
          ok: r.ok,
          status: r.status,
          json: () => r.json().catch(() => ({})),
        }));

      let res = await postOnboarding(token);
      // Token may be expired in the browser; refresh once then retry.
      if (!res.ok && res.status === 401) {
        const refreshed = await supabase.auth.refreshSession();
        const newToken = refreshed.data.session?.access_token;
        if (newToken) {
          res = await postOnboarding(newToken);
        }
      }

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setError("Session verification failed (401). Please sign out, sign in again, then retry.");
        } else {
          setError(data.error || `Error ${res.status}`);
        }
        return;
      }
      await refreshMe();
    } catch (e) {
      console.error("Onboarding submit failed:", e);
      setError("Could not reach server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (mode === "choose") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-4">
          <h1 className="text-2xl font-semibold text-gray-800 text-center">Set up your workspace</h1>
          <p className="text-sm text-gray-500 text-center">Create a new organization or join with an invite code from your manager.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("create")}
              className="p-6 rounded-2xl border-2 border-gray-100 bg-white hover:border-[#2abaad] text-left transition-all"
            >
              <p className="font-semibold text-gray-800">Create organization</p>
              <p className="text-xs text-gray-500 mt-2">I am a manager starting a new site.</p>
            </button>
            <button
              type="button"
              onClick={() => setMode("join")}
              className="p-6 rounded-2xl border-2 border-gray-100 bg-white hover:border-[#2abaad] text-left transition-all"
            >
              <p className="font-semibold text-gray-800">Join with code</p>
              <p className="text-xs text-gray-500 mt-2">I have an invite from my manager.</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <button type="button" onClick={() => setMode("choose")} className="text-sm text-[#2abaad]">
          ← Back
        </button>
        <h2 className="text-lg font-semibold text-gray-800">
          {mode === "create" ? "Create organization" : "Join organization"}
        </h2>

        <div>
          <label className="text-xs text-gray-500 uppercase">Your name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
            placeholder="e.g. Jane Smith"
          />
        </div>

        {mode === "join" && (
          <>
            <div className="flex gap-2">
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono tracking-widest"
                placeholder="INVITE CODE"
              />
              <button
                type="button"
                onClick={() => void lookupInvite()}
                className="px-4 py-2 rounded-xl bg-gray-100 text-sm font-medium"
              >
                Verify
              </button>
            </div>
            {preview?.valid && (
              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-xs text-gray-500">Site / location</label>
                  <select
                    value={siteLocationId}
                    onChange={(e) => setSiteLocationId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200"
                  >
                    {(preview.siteLocations ?? []).map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Team</label>
                  <select
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200"
                  >
                    {(preview.teams ?? []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Shift</label>
                  <select
                    value={shiftId}
                    onChange={(e) => setShiftId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200"
                  >
                    {(preview.shifts ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          disabled={busy || !displayName.trim() || (mode === "join" && !preview?.valid)}
          onClick={() => void submit()}
          className="w-full py-3 rounded-xl bg-[#2abaad] text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Continue
        </button>
      </div>
    </div>
  );
}
