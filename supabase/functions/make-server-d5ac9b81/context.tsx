import * as jose from "npm:jose@5.9.6";
import * as kv from "./kv_store.tsx";

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
  const anonKey = (apikeyHeader || Deno.env.get("SUPABASE_ANON_KEY") || "").trim();
  if (!anonKey) return null;

  const envUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const reqOrigin = requestUrl ? new URL(requestUrl).origin : undefined;
  const projectUrl = envUrl || reqOrigin;
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
    console.error(
      "JWT secret not set and remote auth verification unavailable — set SUPABASE_URL + SUPABASE_ANON_KEY or APP_JWT_SECRET",
    );
    return null;
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
    return null;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const raw = parseKvValue(await kv.get(`user_profile:${userId}`));
  if (!raw || typeof raw !== "object" || !raw.tenantId) return null;
  return raw as UserProfile;
}

export async function loadRequestContext(
  authHeader: string | undefined,
  apikeyHeader?: string,
  requestUrl?: string,
): Promise<{ jwt: { sub: string; email: string }; profile: UserProfile | null } | null> {
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
