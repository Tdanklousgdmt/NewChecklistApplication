import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient, type Session, type User } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { setAccessToken } from "../lib/authToken";
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

const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

type AuthContextValue = {
  supabase: typeof supabase;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  org: TenantOrg | null;
  roster: RosterEntry[];
  loading: boolean;
  meLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(accessToken: string): Promise<MeResponse | null> {
  const res = await fetch(`${SERVER_URL}/auth/me`, {
    headers: {
      apikey: publicAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [org, setOrg] = useState<TenantOrg | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [meLoading, setMeLoading] = useState(false);

  const loadMe = useCallback(async (token: string) => {
    setMeLoading(true);
    try {
      const data = await fetchMe(token);
      if (data) {
        setProfile(data.profile);
        setOrg(data.org);
        setRoster(data.roster ?? []);
      }
    } finally {
      setMeLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = session?.access_token ?? null;
    setAccessToken(t);
    if (t) void loadMe(t);
    else {
      setProfile(null);
      setOrg(null);
      setRoster([]);
    }
  }, [session?.access_token, loadMe]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error: error as Error | null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setOrg(null);
    setRoster([]);
  }, []);

  const refreshMe = useCallback(async () => {
    const token = session?.access_token;
    if (token) await loadMe(token);
  }, [session?.access_token, loadMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      supabase,
      session,
      user: session?.user ?? null,
      profile,
      org,
      roster,
      loading,
      meLoading,
      signIn,
      signUp,
      signOut,
      refreshMe,
    }),
    [session, profile, org, roster, loading, meLoading, signIn, signUp, signOut, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
