import type { Context, Next } from "npm:hono";
import {
  loadRequestContext,
  toRequestContext,
  getUserProfile,
  type RequestContext,
  type UserProfile,
  type AppRole,
} from "./context.tsx";
import { demoUserIdForRole, ensureDemoTenant } from "./demo_seed.tsx";

export type Variables = {
  jwtPair: { jwt: { sub: string; email: string }; profile: UserProfile | null };
  reqCtx: RequestContext | undefined;
};

/** Role-picker demo: anon key + X-App-Role (no Supabase user JWT). */
async function tryDemoContext(
  c: Context<{ Variables: Variables }>,
): Promise<{ jwt: { sub: string; email: string }; profile: UserProfile } | null> {
  const roleHeader = c.req.header("X-App-Role")?.toLowerCase().trim();
  if (roleHeader !== "manager" && roleHeader !== "user") return null;
  const auth = c.req.header("Authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const apikey = c.req.header("apikey")?.trim() || "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  if (!anon) return null;
  if (bearer !== anon && apikey !== anon) return null;
  await ensureDemoTenant();
  const sub = demoUserIdForRole(roleHeader as AppRole);
  const profile = await getUserProfile(sub);
  if (!profile) return null;
  return { jwt: { sub: profile.userId, email: profile.email }, profile };
}

export async function authMiddleware(c: Context<{ Variables: Variables }>, next: Next) {
  const authHeader = c.req.header("Authorization");
  let pair = await loadRequestContext(authHeader);
  if (!pair) {
    const demo = await tryDemoContext(c);
    if (!demo) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    pair = { jwt: demo.jwt, profile: demo.profile };
  }
  c.set("jwtPair", pair);
  if (pair.profile) {
    c.set("reqCtx", toRequestContext(pair.jwt, pair.profile));
  } else {
    c.set("reqCtx", undefined);
  }
  await next();
}

export async function requireOnboardedMiddleware(c: Context<{ Variables: Variables }>, next: Next) {
  const ctx = c.get("reqCtx");
  if (!ctx) {
    return c.json({ error: "Complete onboarding first" }, 403);
  }
  await next();
}
