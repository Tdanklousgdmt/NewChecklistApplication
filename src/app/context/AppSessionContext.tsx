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
  refreshMe: () => Promise<void>;
};

const AppSessionContext = createContext<AppSessionValue | null>(null);

const EDGE_API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-d5ac9b81`;

async function fetchMe(): Promise<MeResponse | null> {
  const headers = {
    apikey: publicAnonKey,
    Authorization: `Bearer ${publicAnonKey}`,
  };
  const tryBase = async (base: string) => {
    const b = base.replace(/\/$/, "");
    const res = await fetch(`${b}/auth/me`, { headers });
    if (!res.ok) return null;
    return res.json() as Promise<MeResponse>;
  };

  let data = await tryBase(SERVER_URL);
  if (!data && SERVER_URL !== EDGE_API_BASE) {
    data = await tryBase(EDGE_API_BASE);
  }
  return data;
}

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [org, setOrg] = useState<TenantOrg | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMe();
      if (data) {
        setProfile(data.profile);
        setOrg(data.org);
        setRoster(data.roster ?? []);
      } else {
        setProfile(null);
        setOrg(null);
        setRoster([]);
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
      refreshMe,
    }),
    [profile, org, roster, loading, refreshMe],
  );

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>;
}

export function useAppSession() {
  const ctx = useContext(AppSessionContext);
  if (!ctx) throw new Error("useAppSession must be used within AppSessionProvider");
  return ctx;
}
