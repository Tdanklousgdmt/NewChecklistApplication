import { Hono } from "hono";
import * as kv from "./kv_store.js";
import type { AppRole, UserProfile } from "./context.js";
import { getUserProfile } from "./context.js";
import { authMiddleware, requireOnboardedMiddleware, type Variables } from "./middleware.js";

const app = new Hono<{ Variables: Variables }>();
app.use("*", authMiddleware);

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

type JwtPair = { jwt: { sub: string; email: string }; profile: UserProfile | null };

const DEFAULT_TEAMS = [
  { id: "TM_SAFETY", name: "Safety Team" },
  { id: "TM_MAINT", name: "Maintenance Team" },
  { id: "TM_OPS", name: "Operations Team" },
];

const DEFAULT_SHIFTS = [
  { id: "SHIFT_A", name: "Shift A (Day)" },
  { id: "SHIFT_B", name: "Shift B (Evening)" },
  { id: "SHIFT_C", name: "Shift C (Night)" },
];

const DEFAULT_SITE_LOCATIONS = [
  { id: "site_north", label: "North Plant" },
  { id: "site_south", label: "South Plant" },
  { id: "site_warehouse", label: "Warehouse" },
  { id: "site_office", label: "Admin / Office" },
];

export type TenantOrg = {
  tenantId: string;
  teams: { id: string; name: string }[];
  shifts: { id: string; name: string }[];
  siteLocations: { id: string; label: string }[];
  inviteCode: string;
  updatedAt: number;
};

export type TenantRosterEntry = {
  userId: string;
  email: string;
  displayName: string;
  siteLocationId: string;
  teamId: string;
  shiftId: string;
  appRole: AppRole;
  updatedAt: number;
};

function randomInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function readOrg(tenantId: string): Promise<TenantOrg | null> {
  const raw = parseKvValue(await kv.get(`tenant_org:${tenantId}`));
  return raw && raw.tenantId ? (raw as TenantOrg) : null;
}

// ── GET /auth/me ─────────────────────────────────────────────────────────────
app.get("/auth/me", async (c) => {
  const pair = c.get("jwtPair") as JwtPair | undefined;
  if (!pair) return c.json({ error: "Unauthorized" }, 401);
  const { jwt, profile } = pair;
  let org: TenantOrg | null = null;
  let roster: TenantRosterEntry[] = [];
  if (profile) {
    org = await readOrg(profile.tenantId);
    const prefix = `tenant_roster:${profile.tenantId}:`;
    const rawList = await kv.getByPrefix(prefix);
    roster = (Array.isArray(rawList) ? rawList : [])
      .map(parseKvValue)
      .filter((r: any) => r && r.userId);
  }
  return c.json({
    user: { id: jwt.sub, email: jwt.email },
    profile,
    org,
    roster: profile?.appRole === "manager" ? roster : roster.filter((r) => r.userId === jwt.sub),
  });
});

// ── POST /auth/onboarding ────────────────────────────────────────────────────
app.post("/auth/onboarding", async (c) => {
  const pair = c.get("jwtPair") as JwtPair | undefined;
  if (!pair) return c.json({ error: "Unauthorized" }, 401);
  const { jwt } = pair;
  const existing = await getUserProfile(jwt.sub);
  if (existing) {
    return c.json({ error: "Already onboarded", profile: existing }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const mode = body.mode as string | undefined;
  const inviteCode = typeof body.inviteCode === "string" ? body.inviteCode.trim().toUpperCase() : "";

  if (mode === "join" && inviteCode) {
    const inv = parseKvValue(await kv.get(`invite_lookup:${inviteCode}`));
    if (!inv || typeof inv.tenantId !== "string") {
      return c.json({ error: "Invalid invite code" }, 400);
    }
    const tenantId = inv.tenantId as string;
    const profile: UserProfile = {
      userId: jwt.sub,
      email: jwt.email || "",
      tenantId,
      appRole: "user",
      displayName: typeof body.displayName === "string" ? body.displayName : "",
      updatedAt: Date.now(),
    };
    await kv.set(`user_profile:${jwt.sub}`, profile);
    const entry: TenantRosterEntry = {
      userId: jwt.sub,
      email: profile.email,
      displayName: profile.displayName || profile.email || jwt.sub,
      siteLocationId: typeof body.siteLocationId === "string" ? body.siteLocationId : "",
      teamId: typeof body.teamId === "string" ? body.teamId : "",
      shiftId: typeof body.shiftId === "string" ? body.shiftId : "",
      appRole: "user",
      updatedAt: Date.now(),
    };
    await kv.set(`tenant_roster:${tenantId}:${jwt.sub}`, entry);
    return c.json({ success: true, profile });
  }

  if (mode === "create") {
    const tenantId = `tenant_${crypto.randomUUID()}`;
    const code = randomInviteCode();
    const org: TenantOrg = {
      tenantId,
      teams: [...DEFAULT_TEAMS],
      shifts: [...DEFAULT_SHIFTS],
      siteLocations: [...DEFAULT_SITE_LOCATIONS],
      inviteCode: code,
      updatedAt: Date.now(),
    };
    await kv.set(`tenant_org:${tenantId}`, org);
    await kv.set(`invite_lookup:${code}`, { tenantId, createdAt: Date.now() });

    const profile: UserProfile = {
      userId: jwt.sub,
      email: jwt.email || "",
      tenantId,
      appRole: "manager",
      displayName: typeof body.displayName === "string" ? body.displayName : "",
      updatedAt: Date.now(),
    };
    await kv.set(`user_profile:${jwt.sub}`, profile);

    const entry: TenantRosterEntry = {
      userId: jwt.sub,
      email: profile.email,
      displayName: profile.displayName || profile.email || "Manager",
      siteLocationId: typeof body.siteLocationId === "string" ? body.siteLocationId : DEFAULT_SITE_LOCATIONS[0].id,
      teamId: typeof body.teamId === "string" ? body.teamId : DEFAULT_TEAMS[0].id,
      shiftId: typeof body.shiftId === "string" ? body.shiftId : DEFAULT_SHIFTS[0].id,
      appRole: "manager",
      updatedAt: Date.now(),
    };
    await kv.set(`tenant_roster:${tenantId}:${jwt.sub}`, entry);
    return c.json({ success: true, profile, org });
  }

  return c.json({ error: "Invalid body: use mode create or join" }, 400);
});

const orgApp = new Hono<{ Variables: Variables }>();
orgApp.use("*", requireOnboardedMiddleware);

// ── GET /org/settings ───────────────────────────────────────────────────────
orgApp.get("/org/settings", async (c) => {
  const ctx = c.get("reqCtx")!;
  if (ctx.appRole !== "manager") return c.json({ error: "Forbidden" }, 403);
  const org = await readOrg(ctx.tenantId);
  if (!org) return c.json({ error: "Organization not found" }, 404);
  return c.json({ org });
});

// ── PUT /org/settings ────────────────────────────────────────────────────────
orgApp.put("/org/settings", async (c) => {
  const ctx = c.get("reqCtx")!;
  if (ctx.appRole !== "manager") return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json().catch(() => ({}));
  const org = await readOrg(ctx.tenantId);
  if (!org) return c.json({ error: "Organization not found" }, 404);

  const teams = Array.isArray(body.teams) ? body.teams : org.teams;
  const shifts = Array.isArray(body.shifts) ? body.shifts : org.shifts;
  const siteLocations = Array.isArray(body.siteLocations) ? body.siteLocations : org.siteLocations;

  const updated: TenantOrg = {
    ...org,
    teams,
    shifts,
    siteLocations,
    updatedAt: Date.now(),
  };
  await kv.set(`tenant_org:${ctx.tenantId}`, updated);
  return c.json({ success: true, org: updated });
});

// ── POST /org/regenerate-invite ───────────────────────────────────────────────
orgApp.post("/org/regenerate-invite", async (c) => {
  const ctx = c.get("reqCtx")!;
  if (ctx.appRole !== "manager") return c.json({ error: "Forbidden" }, 403);
  const org = await readOrg(ctx.tenantId);
  if (!org) return c.json({ error: "Organization not found" }, 404);

  if (org.inviteCode) {
    await kv.del(`invite_lookup:${org.inviteCode}`);
  }
  const code = randomInviteCode();
  await kv.set(`invite_lookup:${code}`, { tenantId: ctx.tenantId, createdAt: Date.now() });
  const updated = { ...org, inviteCode: code, updatedAt: Date.now() };
  await kv.set(`tenant_org:${ctx.tenantId}`, updated);
  return c.json({ success: true, org: updated });
});

// ── GET /org/roster ───────────────────────────────────────────────────────────
orgApp.get("/org/roster", async (c) => {
  const ctx = c.get("reqCtx")!;
  const prefix = `tenant_roster:${ctx.tenantId}:`;
  const rawList = await kv.getByPrefix(prefix);
  const roster = (Array.isArray(rawList) ? rawList : [])
    .map(parseKvValue)
    .filter((r: any) => r && r.userId) as TenantRosterEntry[];

  if (ctx.appRole !== "manager") {
    const mine = roster.find((r) => r.userId === ctx.userId);
    return c.json({ roster: mine ? [mine] : [] });
  }
  return c.json({ roster });
});

// ── PUT /org/roster/:userId ───────────────────────────────────────────────────
orgApp.put("/org/roster/:userId", async (c) => {
  const ctx = c.get("reqCtx")!;
  if (ctx.appRole !== "manager") return c.json({ error: "Forbidden" }, 403);

  const targetUserId = c.req.param("userId");
  const body = await c.req.json().catch(() => ({}));

  const targetProfile = parseKvValue(await kv.get(`user_profile:${targetUserId}`)) as UserProfile | null;
  if (!targetProfile || targetProfile.tenantId !== ctx.tenantId) {
    return c.json({ error: "User not in your organization" }, 404);
  }

  const existing = parseKvValue(await kv.get(`tenant_roster:${ctx.tenantId}:${targetUserId}`)) as TenantRosterEntry | null;
  const entry: TenantRosterEntry = {
    userId: targetUserId,
    email: targetProfile.email,
    displayName: typeof body.displayName === "string" ? body.displayName : (existing?.displayName ?? targetProfile.email),
    siteLocationId: typeof body.siteLocationId === "string" ? body.siteLocationId : (existing?.siteLocationId ?? ""),
    teamId: typeof body.teamId === "string" ? body.teamId : (existing?.teamId ?? ""),
    shiftId: typeof body.shiftId === "string" ? body.shiftId : (existing?.shiftId ?? ""),
    appRole: body.appRole === "manager" || body.appRole === "user" ? body.appRole : (existing?.appRole ?? targetProfile.appRole),
    updatedAt: Date.now(),
  };

  await kv.set(`tenant_roster:${ctx.tenantId}:${targetUserId}`, entry);

  if (entry.appRole !== targetProfile.appRole) {
    const updatedProfile: UserProfile = { ...targetProfile, appRole: entry.appRole, updatedAt: Date.now() };
    await kv.set(`user_profile:${targetUserId}`, updatedProfile);
  }

  return c.json({ success: true, entry });
});

app.route("/", orgApp);

export default app;
