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

export async function verifySupabaseJwt(authHeader: string | undefined): Promise<{
  sub: string;
  email: string;
} | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const secret = Deno.env.get("SUPABASE_JWT_SECRET");
  if (!secret) {
    console.error("SUPABASE_JWT_SECRET is not set — cannot verify JWTs");
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
): Promise<{ jwt: { sub: string; email: string }; profile: UserProfile | null } | null> {
  const jwt = await verifySupabaseJwt(authHeader);
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
