import type { Context, Next } from "npm:hono";
import {
  loadRequestContext,
  toRequestContext,
  type RequestContext,
  type UserProfile,
} from "./context.tsx";

export type Variables = {
  jwtPair: { jwt: { sub: string; email: string }; profile: UserProfile | null };
  reqCtx: RequestContext | undefined;
};

export async function authMiddleware(c: Context<{ Variables: Variables }>, next: Next) {
  const authHeader = c.req.header("Authorization");
  const apikeyHeader = c.req.header("apikey");
  const pair = await loadRequestContext(authHeader, apikeyHeader, c.req.url, c.req.header("X-App-Role") ?? undefined);
  if (!pair) {
    return c.json({ error: "Unauthorized" }, 401);
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
