import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Users, Copy, RefreshCw } from "lucide-react";
import { BurgerButton } from "./NavDrawer";
import { toast } from "sonner";
import { useAuth, type RosterEntry } from "../context/AuthContext";
import { checklistService } from "../services/checklistService";

interface UserManagementScreenProps {
  onOpenNav?: () => void;
}

export function UserManagementScreen({ onOpenNav }: UserManagementScreenProps) {
  const { org, roster, refreshMe, profile } = useAuth();
  const [localRoster, setLocalRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await refreshMe();
    } finally {
      setLoading(false);
    }
  }, [refreshMe]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setLocalRoster(roster);
  }, [roster]);

  const locLabel = useMemo(() => {
    const m = new Map((org?.siteLocations ?? []).map((l) => [l.id, l.label]));
    return (id: string) => m.get(id) || id || "—";
  }, [org]);

  const teamLabel = useMemo(() => {
    const m = new Map((org?.teams ?? []).map((t) => [t.id, t.name]));
    return (id: string) => m.get(id) || id || "—";
  }, [org]);

  const shiftLabel = useMemo(() => {
    const m = new Map((org?.shifts ?? []).map((s) => [s.id, s.name]));
    return (id: string) => m.get(id) || id || "—";
  }, [org]);

  const updateRow = async (userId: string, patch: Partial<RosterEntry>) => {
    setSavingId(userId);
    try {
      await checklistService.updateRosterEntry(userId, {
        displayName: patch.displayName,
        siteLocationId: patch.siteLocationId,
        teamId: patch.teamId,
        shiftId: patch.shiftId,
        appRole: patch.appRole,
      });
      setLocalRoster((prev) =>
        prev.map((r) => (r.userId === userId ? { ...r, ...patch, updatedAt: Date.now() } : r)),
      );
      await refreshMe();
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSavingId(null);
    }
  };

  const copyInvite = () => {
    const code = org?.inviteCode;
    if (!code) return;
    void navigator.clipboard.writeText(code);
    toast.success("Invite code copied");
  };

  const regenInvite = async () => {
    try {
      await checklistService.regenerateInvite();
      await refreshMe();
      toast.success("New invite code generated");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

  if (profile?.appRole !== "manager") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-gray-500">Managers only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onOpenNav && <BurgerButton onClick={onOpenNav} />}
          <Users className="w-5 h-5 text-[#2abaad]" />
          <h1 className="text-sm font-semibold text-gray-800">User management</h1>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <section className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Invite operators</h2>
          <p className="text-sm text-gray-600 mb-3">
            Share this code so teammates can sign up and join your organization. They pick site, team, and shift on join.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="px-3 py-2 bg-gray-50 rounded-lg font-mono text-lg tracking-widest">
              {org?.inviteCode ?? "—"}
            </code>
            <button
              type="button"
              onClick={copyInvite}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2abaad] text-white text-sm"
            >
              <Copy className="w-4 h-4" /> Copy
            </button>
            <button
              type="button"
              onClick={() => void regenInvite()}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
            >
              Regenerate code
            </button>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">People & assignments</h2>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase text-gray-400 border-b border-gray-50">
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Role</th>
                  <th className="px-3 py-2 font-semibold">Site</th>
                  <th className="px-3 py-2 font-semibold">Team</th>
                  <th className="px-3 py-2 font-semibold">Shift</th>
                </tr>
              </thead>
              <tbody>
                {localRoster.map((r) => (
                  <tr key={r.userId} className="border-b border-gray-50 hover:bg-gray-50/80">
                    <td className="px-3 py-2 align-top">
                      <input
                        defaultValue={r.displayName}
                        key={`${r.userId}-${r.updatedAt}`}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== r.displayName) void updateRow(r.userId, { displayName: v });
                        }}
                        className="w-full min-w-[8rem] px-2 py-1 rounded-lg border border-gray-200 text-sm"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[14rem]">{r.email}</p>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <select
                        value={r.appRole}
                        disabled={r.userId === profile?.userId || savingId === r.userId}
                        onChange={(e) =>
                          void updateRow(r.userId, { appRole: e.target.value as "manager" | "user" })
                        }
                        className="px-2 py-1 rounded-lg border border-gray-200 text-sm"
                      >
                        <option value="user">Operator</option>
                        <option value="manager">Manager</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <select
                        value={r.siteLocationId}
                        onChange={(e) => void updateRow(r.userId, { siteLocationId: e.target.value })}
                        className="px-2 py-1 rounded-lg border border-gray-200 text-sm max-w-[10rem]"
                      >
                        <option value="">—</option>
                        {(org?.siteLocations ?? []).map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-400 mt-0.5">{locLabel(r.siteLocationId)}</p>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <select
                        value={r.teamId}
                        onChange={(e) => void updateRow(r.userId, { teamId: e.target.value })}
                        className="px-2 py-1 rounded-lg border border-gray-200 text-sm max-w-[10rem]"
                      >
                        <option value="">—</option>
                        {(org?.teams ?? []).map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-400 mt-0.5">{teamLabel(r.teamId)}</p>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <select
                        value={r.shiftId}
                        onChange={(e) => void updateRow(r.userId, { shiftId: e.target.value })}
                        className="px-2 py-1 rounded-lg border border-gray-200 text-sm max-w-[10rem]"
                      >
                        <option value="">—</option>
                        {(org?.shifts ?? []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-400 mt-0.5">{shiftLabel(r.shiftId)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {localRoster.length === 0 && !loading && (
              <p className="p-6 text-center text-sm text-gray-400">No people yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
