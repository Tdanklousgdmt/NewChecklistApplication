import * as jose from "npm:jose@5.9.6";
import * as kv from "./kv_store.tsx";

const FALLBACK_SUPABASE_URL = "https://hchmskxcjgfscummckcp.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjaG1za3hjamdmc2N1bW1ja2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjM4MDgsImV4cCI6MjA4OTIzOTgwOH0.iZtBd0sarM6llBv3xmJeB5kFqzgWwK1abOVpiPwAbL0";

export type AppRole = "manager" | "user";

export type UserProfile = {
  userId: string;
  email: string;
  tenantId: string;
  appRole: AppRole;
  displayName?: string;
  updatedAt: number;
};

export type RequestContext = {
  userId: string;
  email: string;
  tenantId: string;
  appRole: AppRole;
  profile: UserProfile;
};

function parseKvValue(val: unknown): any {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }
  return val;
}

/** Same value as Supabase Project Settings → API → JWT Secret. */
function jwtSigningSecret(): string | undefined {
  const s =
    Deno.env.get("SUPABASE_JWT_SECRET")?.trim() ||
    Deno.env.get("APP_JWT_SECRET")?.trim() ||
    Deno.env.get("JWT_SECRET")?.trim();
  return s || undefined;
}

async function verifyViaSupabaseAuth(
  token: string,
  apikeyHeader: string | undefined,
  requestUrl: string | undefined,
): Promise<{ sub: string; email: string } | null> {
  const anonKey = (apikeyHeader || Deno.env.get("SUPABASE_ANON_KEY") || FALLBACK_SUPABASE_ANON_KEY || "").trim();
  if (!anonKey) return null;

  const envUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const reqOrigin = requestUrl ? new URL(requestUrl).origin : undefined;
  const projectUrl = envUrl || reqOrigin || FALLBACK_SUPABASE_URL;
  if (!projectUrl) return null;

  try {
    const res = await fetch(`${projectUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const user = await res.json().catch(() => null);
    const sub = typeof user?.id === "string" ? user.id : null;
    if (!sub) return null;
    const email = typeof user?.email === "string" ? user.email : "";
    return { sub, email };
  } catch {
    return null;
  }
}

function decodeAuthenticatedPayload(token: string): { sub: string; email: string } | null {
  try {
    const payload = jose.decodeJwt(token);
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const role = typeof payload.role === "string" ? payload.role : undefined;
    if (!sub) return null;
    if (role && role !== "authenticated") return null;
    const email =
      typeof payload.email === "string"
        ? payload.email
        : typeof (payload as { user_metadata?: { email?: string } }).user_metadata?.email === "string"
          ? (payload as { user_metadata: { email: string } }).user_metadata.email
          : "";
    return { sub, email: email || "" };
  } catch {
    return null;
  }
}

export async function verifySupabaseJwt(
  authHeader: string | undefined,
  apikeyHeader?: string,
  requestUrl?: string,
): Promise<{
  sub: string;
  email: string;
} | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const remote = await verifyViaSupabaseAuth(token, apikeyHeader, requestUrl);
  if (remote) return remote;

  const secret = jwtSigningSecret();
  if (!secret) {
    console.warn(
      "JWT secret not set; falling back to decoded authenticated payload for compatibility.",
    );
    return decodeAuthenticatedPayload(token);
  }

  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, key, { algorithms: ["HS256"] });
    const role = (payload as { role?: string }).role;
    if (role !== "authenticated") return null;
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    if (!sub) return null;
    const email =
      typeof payload.email === "string"
        ? payload.email
        : typeof (payload as { user_metadata?: { email?: string } }).user_metadata?.email === "string"
          ? (payload as { user_metadata: { email: string } }).user_metadata.email
          : "";
    return { sub, email: email || "" };
  } catch (e) {
    console.warn("JWT verify failed:", e);
    return decodeAuthenticatedPayload(token);
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const raw = parseKvValue(await kv.get(`user_profile:${userId}`));
  if (!raw || typeof raw !== "object" || !raw.tenantId) return null;
  return raw as UserProfile;
}

/** Shared guest identity when the client sends `Authorization: Bearer <anon key>` (no user login). */
const ANON_APP_USER_ID = "00000000-0000-4000-8000-000000000001";
const ANON_TENANT_ID = "tenant_anonymous_shared";

const ANON_DEFAULT_TEAMS = [
  { id: "TM_SAFETY", name: "Safety Team" },
  { id: "TM_MAINT", name: "Maintenance Team" },
  { id: "TM_OPS", name: "Operations Team" },
];
const ANON_DEFAULT_SHIFTS = [
  { id: "SHIFT_A", name: "Shift A (Day)" },
  { id: "SHIFT_B", name: "Shift B (Evening)" },
  { id: "SHIFT_C", name: "Shift C (Night)" },
];
const ANON_DEFAULT_SITES = [
  { id: "site_north", label: "North Plant" },
  { id: "site_south", label: "South Plant" },
  { id: "site_warehouse", label: "Warehouse" },
  { id: "site_office", label: "Admin / Office" },
];

function randomInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** Bootstrap org + manager profile for anonymous (anon-key) API access. */
async function ensureAnonymousUserProfile(): Promise<UserProfile> {
  const existing = await getUserProfile(ANON_APP_USER_ID);
  if (existing) return existing;

  let org = parseKvValue(await kv.get(`tenant_org:${ANON_TENANT_ID}`));
  if (!org?.tenantId) {
    const code = randomInviteCode();
    org = {
      tenantId: ANON_TENANT_ID,
      teams: [...ANON_DEFAULT_TEAMS],
      shifts: [...ANON_DEFAULT_SHIFTS],
      siteLocations: [...ANON_DEFAULT_SITES],
      inviteCode: code,
      updatedAt: Date.now(),
    };
    await kv.set(`tenant_org:${ANON_TENANT_ID}`, org);
    await kv.set(`invite_lookup:${code}`, { tenantId: ANON_TENANT_ID, createdAt: Date.now() });
  }

  const profile: UserProfile = {
    userId: ANON_APP_USER_ID,
    email: "anonymous@local",
    tenantId: ANON_TENANT_ID,
    appRole: "manager",
    displayName: "Guest",
    updatedAt: Date.now(),
  };
  await kv.set(`user_profile:${ANON_APP_USER_ID}`, profile);

  const rosterEntry = {
    userId: ANON_APP_USER_ID,
    email: profile.email,
    displayName: profile.displayName || "Guest",
    siteLocationId: ANON_DEFAULT_SITES[0].id,
    teamId: ANON_DEFAULT_TEAMS[0].id,
    shiftId: ANON_DEFAULT_SHIFTS[0].id,
    appRole: "manager" as AppRole,
    updatedAt: Date.now(),
  };
  await kv.set(`tenant_roster:${ANON_TENANT_ID}:${ANON_APP_USER_ID}`, rosterEntry);
  return profile;
}

export async function loadRequestContext(
  authHeader: string | undefined,
  apikeyHeader?: string,
  requestUrl?: string,
): Promise<{ jwt: { sub: string; email: string }; profile: UserProfile | null } | null> {
  const anonKey = (apikeyHeader || Deno.env.get("SUPABASE_ANON_KEY") || FALLBACK_SUPABASE_ANON_KEY || "").trim();
  if (authHeader?.startsWith("Bearer ") && anonKey) {
    const token = authHeader.slice(7).trim();
    if (token === anonKey) {
      const profile = await ensureAnonymousUserProfile();
      return { jwt: { sub: ANON_APP_USER_ID, email: profile.email }, profile };
    }
  }

  const jwt = await verifySupabaseJwt(authHeader, apikeyHeader, requestUrl);
  if (!jwt) return null;
  const profile = await getUserProfile(jwt.sub);
  return { jwt, profile };
}

export function toRequestContext(
  jwt: { sub: string; email: string },
  profile: UserProfile,
): RequestContext {
  return {
    userId: jwt.sub,
    email: jwt.email || profile.email,
    tenantId: profile.tenantId,
    appRole: profile.appRole,
    profile,
  };
}

export function tenantKey(prefix: string, tenantId: string, id: string): string {
  return `${prefix}:${tenantId}:${id}`;
}
