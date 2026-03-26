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
import {
  isLocalMode,
  localApiFetch,
  localClearSession,
  localGetSession,
  localLogin,
  localRegister,
} from "../lib/localBackend";

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

function localSessionFromStorage(): Session | null {
  const s = localGetSession();
  if (!s) return null;
  return {
    access_token: s.token,
    token_type: "bearer",
    expires_in: 999999999,
    expires_at: undefined,
    refresh_token: "",
    user: { id: s.userId, email: s.email, app_metadata: {}, user_metadata: {}, aud: "local", created_at: "" } as User,
  } as Session;
}

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
  localMode: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMeRemote(accessToken: string): Promise<MeResponse | null> {
  const res = await fetch(`${SERVER_URL}/auth/me`, {
    headers: {
      apikey: publicAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchMeLocal(token: string): Promise<MeResponse | null> {
  const res = await localApiFetch("GET", "/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) return null;
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const localMode = isLocalMode();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [org, setOrg] = useState<TenantOrg | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [meLoading, setMeLoading] = useState(false);

  const loadMe = useCallback(
    async (token: string) => {
      setMeLoading(true);
      try {
        const data = localMode ? await fetchMeLocal(token) : await fetchMeRemote(token);
        if (data) {
          setProfile(data.profile);
          setOrg(data.org);
          setRoster(data.roster ?? []);
        }
      } finally {
        setMeLoading(false);
      }
    },
    [localMode],
  );

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
    if (localMode) {
      const s = localGetSession();
      if (s?.token) setAccessToken(s.token);
      else setAccessToken(null);
      setSession(localSessionFromStorage());
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [localMode]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (localMode) {
        const r = localLogin(email, password);
        if (r.error) return { error: new Error(r.error) };
        setSession(localSessionFromStorage());
        return { error: null };
      }
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return { error: error as Error | null };
    },
    [localMode],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (localMode) {
        const r = localRegister(email, password);
        if (r.error) return { error: new Error(r.error) };
        setSession(localSessionFromStorage());
        return { error: null };
      }
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      return { error: error as Error | null };
    },
    [localMode],
  );

  const signOut = useCallback(async () => {
    if (localMode) {
      localClearSession();
      setSession(null);
    } else {
      await supabase.auth.signOut();
    }
    setProfile(null);
    setOrg(null);
    setRoster([]);
  }, [localMode]);

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
      localMode,
    }),
    [session, profile, org, roster, loading, meLoading, signIn, signUp, signOut, refreshMe, localMode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
