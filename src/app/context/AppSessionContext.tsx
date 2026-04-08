import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { SERVER_URL } from "../services/checklistService";

export type AppRole = "manager" | "user";

export type UserProfile = {
  userId: string;
  email: string;
  tenantId: string;
  appRole: AppRole;
  displayName?: string;
  updatedAt: number;
};

export type OrgTeam = { id: string; name: string };
export type OrgShift = { id: string; name: string };
export type OrgSiteLocation = { id: string; label: string };

export type TenantOrg = {
  tenantId: string;
  teams: OrgTeam[];
  shifts: OrgShift[];
  siteLocations: OrgSiteLocation[];
  inviteCode: string;
  updatedAt: number;
};

export type RosterEntry = {
  userId: string;
  email: string;
  displayName: string;
  siteLocationId: string;
  teamId: string;
  shiftId: string;
  appRole: AppRole;
  updatedAt: number;
};

type MeResponse = {
  user: { id: string; email: string };
  profile: UserProfile | null;
  org: TenantOrg | null;
  roster: RosterEntry[];
};

type AppSessionValue = {
  profile: UserProfile | null;
  org: TenantOrg | null;
  roster: RosterEntry[];
  loading: boolean;
  /** Set when /auth/me fails so the UI can show a useful hint (not just "check network"). */
  sessionError: string | null;
  refreshMe: () => Promise<void>;
};

const AppSessionContext = createContext<AppSessionValue | null>(null);

const EDGE_API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-d5ac9b81`;

/** Supabase Edge usually strips the function name from the path (`/auth/me`). Older setups use `/make-server-d5ac9b81/auth/me`. */
const AUTH_ME_PATHS = ["/auth/me", "/make-server-d5ac9b81/auth/me"];

async function fetchMe(): Promise<{ data: MeResponse | null; error: string | null }> {
  const headers: Record<string, string> = {
    apikey: publicAnonKey,
    Authorization: `Bearer ${publicAnonKey}`,
  };

  const bases = [SERVER_URL, EDGE_API_BASE].map((b) => b.replace(/\/$/, ""));
  const uniqueBases = [...new Set(bases)];

  let lastDetail = "Unknown error";

  for (const base of uniqueBases) {
    for (const path of AUTH_ME_PATHS) {
      const url = `${base}${path}`;
      try {
        const res = await fetch(url, { headers });
        const bodyText = await res.text();
        let body: { error?: string; message?: string } = {};
        try {
          body = bodyText ? (JSON.parse(bodyText) as typeof body) : {};
        } catch {
          /* not JSON */
        }

        if (!res.ok) {
          lastDetail =
            res.status === 401
              ? `401 Unauthorized at ${path} — Edge function may reject the anon key; set SUPABASE_ANON_KEY secret to match your project anon key and redeploy.`
              : res.status === 404
                ? `404 at ${path} — function URL or route mismatch. Redeploy \`make-server-d5ac9b81\` from the repo.`
                : `HTTP ${res.status} at ${path}${body.error || body.message ? `: ${body.error || body.message}` : ""}`;
          continue;
        }

        const data = JSON.parse(bodyText || "{}") as MeResponse;
        if (!data?.user) {
          lastDetail = "Invalid response from API (missing user)";
          continue;
        }
        if (!data.profile) {
          lastDetail =
            "API returned no workspace profile. Redeploy the latest Edge function (anonymous guest bootstrap).";
          continue;
        }
        return { data, error: null };
      } catch (e) {
        lastDetail =
          e instanceof TypeError && String(e.message).includes("fetch")
            ? `Network error calling ${url} — offline, wrong URL, or blocked.`
            : String(e);
      }
    }
  }

  return { data: null, error: lastDetail };
}

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [org, setOrg] = useState<TenantOrg | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const refreshMe = useCallback(async () => {
    setLoading(true);
    setSessionError(null);
    try {
      const { data, error } = await fetchMe();
      if (data) {
        setProfile(data.profile);
        setOrg(data.org);
        setRoster(data.roster ?? []);
        setSessionError(null);
      } else {
        setProfile(null);
        setOrg(null);
        setRoster([]);
        setSessionError(error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const value = useMemo<AppSessionValue>(
    () => ({
      profile,
      org,
      roster,
      loading,
      sessionError,
      refreshMe,
    }),
    [profile, org, roster, loading, sessionError, refreshMe],
  );

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>;
}

export function useAppSession() {
  const ctx = useContext(AppSessionContext);
  if (!ctx) throw new Error("useAppSession must be used within AppSessionProvider");
  return ctx;
}
