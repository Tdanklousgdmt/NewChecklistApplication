/**
 * Offline / bypass mode: all auth + checklist data in localStorage.
 * Enable with VITE_LOCAL_MODE=true (build-time). No Supabase Edge or /api required.
 */

import { setAccessToken } from "./authToken";

type AppRole = "manager" | "user";

type UserProfile = {
  userId: string;
  email: string;
  tenantId: string;
  appRole: AppRole;
  displayName?: string;
  updatedAt: number;
};

type TenantOrg = {
  tenantId: string;
  teams: { id: string; name: string }[];
  shifts: { id: string; name: string }[];
  siteLocations: { id: string; label: string }[];
  inviteCode: string;
  updatedAt: number;
};

type RosterEntry = {
  userId: string;
  email: string;
  displayName: string;
  siteLocationId: string;
  teamId: string;
  shiftId: string;
  appRole: AppRole;
  updatedAt: number;
};

const KV_KEY = "e_check_local_kv";
const USERS_KEY = "e_check_local_users";
const SESSION_KEY = "e_check_local_session";
/** When set in localStorage, use in-browser API even if the build has no VITE_LOCAL_MODE (no redeploy). */
const RUNTIME_LOCAL_FLAG = "echeck_local_mode";

type LocalUser = { id: string; email: string; password: string; createdAt: number };

function loadJson<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    if (!s) return fallback;
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val));
}

function kvGet(key: string): unknown {
  const m = loadJson<Record<string, unknown>>(KV_KEY, {});
  return m[key];
}

function kvSet(key: string, value: unknown) {
  const m = loadJson<Record<string, unknown>>(KV_KEY, {});
  m[key] = value;
  saveJson(KV_KEY, m);
}

function kvDel(key: string) {
  const m = loadJson<Record<string, unknown>>(KV_KEY, {});
  delete m[key];
  saveJson(KV_KEY, m);
}

function kvByPrefix(prefix: string): unknown[] {
  const m = loadJson<Record<string, unknown>>(KV_KEY, {});
  return Object.entries(m)
    .filter(([k]) => k.startsWith(prefix))
    .map(([, v]) => v);
}

export function isBuildTimeLocalMode(): boolean {
  const v = import.meta.env.VITE_LOCAL_MODE;
  return v === "true" || v === "1" || String(v).toLowerCase() === "yes";
}

export function isRuntimeLocalMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem(RUNTIME_LOCAL_FLAG);
    return v === "1" || v === "true" || String(v).toLowerCase() === "yes";
  } catch {
    return false;
  }
}

/** Enable/disable browser-only API without rebuilding (reload required). */
export function setRuntimeLocalMode(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) window.localStorage.setItem(RUNTIME_LOCAL_FLAG, "1");
    else window.localStorage.removeItem(RUNTIME_LOCAL_FLAG);
  } catch {
    /* private mode / quota */
  }
}

export function isLocalMode(): boolean {
  return isBuildTimeLocalMode() || isRuntimeLocalMode();
}

function encodeToken(userId: string, email: string): string {
  return btoa(JSON.stringify({ sub: userId, email, role: "authenticated" }));
}

export function localParseAuth(authHeader: string | undefined): { sub: string; email: string } | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const raw = authHeader.slice(7).trim();
  try {
    const p = JSON.parse(atob(raw)) as { sub?: string; email?: string };
    if (p.sub && typeof p.sub === "string") return { sub: p.sub, email: p.email || "" };
  } catch {
    /* ignore */
  }
  return null;
}

export function localGetSession(): { token: string; userId: string; email: string } | null {
  const s = loadJson<{ token: string; userId: string; email: string } | null>(SESSION_KEY, null);
  if (!s?.token || !s.userId) return null;
  return s;
}

export function localSetSession(token: string, userId: string, email: string) {
  saveJson(SESSION_KEY, { token, userId, email });
  setAccessToken(token);
}

export function localClearSession() {
  localStorage.removeItem(SESSION_KEY);
  setAccessToken(null);
}

export function localRegister(email: string, password: string): { error: string | null } {
  const users = loadJson<LocalUser[]>(USERS_KEY, []);
  const e = email.trim().toLowerCase();
  if (users.some((u) => u.email.toLowerCase() === e)) return { error: "Email already registered" };
  const id = `user_${crypto.randomUUID()}`;
  users.push({ id, email: e, password, createdAt: Date.now() });
  saveJson(USERS_KEY, users);
  const token = encodeToken(id, e);
  localSetSession(token, id, e);
  return { error: null };
}

export function localLogin(email: string, password: string): { error: string | null } {
  const users = loadJson<LocalUser[]>(USERS_KEY, []);
  const e = email.trim().toLowerCase();
  const u = users.find((x) => x.email.toLowerCase() === e);
  if (!u || u.password !== password) return { error: "Invalid email or password" };
  const token = encodeToken(u.id, u.email);
  localSetSession(token, u.id, u.email);
  return { error: null };
}

function tenantKey(prefix: string, tenantId: string, id: string) {
  return `${prefix}:${tenantId}:${id}`;
}

function parseKv(val: unknown): any {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }
  return val;
}

const DEFAULT_TEAMS = [
  { id: "TM_SAFETY", name: "Safety Team" },
  { id: "TM_MAINT", name: "Maintenance Team" },
  { id: "TM_OPS", name: "Operations Team" },
];
const DEFAULT_SHIFTS = [
  { id: "SHIFT_A", name: "Shift A (Day)" },
  { id: "SHIFT_B", name: "Shift B (Evening)" },
];
const DEFAULT_LOCS = [
  { id: "site_north", label: "North Plant" },
  { id: "site_south", label: "South Plant" },
];

function randomInvite() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

function getProfile(userId: string): UserProfile | null {
  const raw = parseKv(kvGet(`user_profile:${userId}`));
  if (!raw?.tenantId) return null;
  return raw as UserProfile;
}

function readOrg(tenantId: string): TenantOrg | null {
  const raw = parseKv(kvGet(`tenant_org:${tenantId}`));
  return raw?.tenantId ? (raw as TenantOrg) : null;
}

/** Main router: same path shape as Edge (SERVER_URL + /auth/me → path /auth/me) */
export async function localApiFetch(
  method: string,
  endpoint: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; json: () => Promise<any> }> {
  const auth = localParseAuth((init.headers as Record<string, string>)?.Authorization);
  const bodyText = init.body as string | undefined;
  let body: any = {};
  if (bodyText) {
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = {};
    }
  }

  const err = (status: number, msg: string) =>
    Promise.resolve({
      ok: false,
      status,
      json: async () => ({ error: msg }),
    });

  const ok = (data: any) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => data,
    });

  // ── Public ──
  if (method === "GET" && endpoint.startsWith("/invite-preview")) {
    const u = new URLSearchParams(endpoint.split("?")[1] || "");
    const code = (u.get("code") || "").trim().toUpperCase();
    if (!code) return err(400, "Missing code");
    const inv = parseKv(kvGet(`invite_lookup:${code}`)) as { tenantId?: string } | null;
    if (!inv?.tenantId) return ok({ valid: false });
    const org = readOrg(inv.tenantId);
    return ok({
      valid: true,
      tenantId: inv.tenantId,
      siteLocations: org?.siteLocations ?? DEFAULT_LOCS,
      teams: org?.teams ?? DEFAULT_TEAMS,
      shifts: org?.shifts ?? DEFAULT_SHIFTS,
    });
  }

  if (!auth) return err(401, "Unauthorized");

  const profile = getProfile(auth.sub);

  // ── Auth me ──
  if (method === "GET" && endpoint === "/auth/me") {
    let org: TenantOrg | null = null;
    let roster: RosterEntry[] = [];
    if (profile) {
      org = readOrg(profile.tenantId);
      const prefix = `tenant_roster:${profile.tenantId}:`;
      roster = kvByPrefix(prefix)
        .map(parseKv)
        .filter((r: any) => r?.userId) as RosterEntry[];
      if (profile.appRole !== "manager") roster = roster.filter((r) => r.userId === auth.sub);
    }
    return ok({
      user: { id: auth.sub, email: auth.email },
      profile,
      org,
      roster,
    });
  }

  // ── Onboarding ──
  if (method === "POST" && endpoint === "/auth/onboarding") {
    if (profile) return err(400, "Already onboarded");
    const mode = body.mode;
    if (mode === "join" && body.inviteCode) {
      const code = String(body.inviteCode).trim().toUpperCase();
      const inv = parseKv(kvGet(`invite_lookup:${code}`)) as { tenantId?: string } | null;
      if (!inv?.tenantId) return err(400, "Invalid invite code");
      const tenantId = inv.tenantId;
      const p: UserProfile = {
        userId: auth.sub,
        email: auth.email,
        tenantId,
        appRole: "user",
        displayName: typeof body.displayName === "string" ? body.displayName : "",
        updatedAt: Date.now(),
      };
      kvSet(`user_profile:${auth.sub}`, p);
      const entry: RosterEntry = {
        userId: auth.sub,
        email: p.email,
        displayName: p.displayName || p.email,
        siteLocationId: typeof body.siteLocationId === "string" ? body.siteLocationId : "",
        teamId: typeof body.teamId === "string" ? body.teamId : "",
        shiftId: typeof body.shiftId === "string" ? body.shiftId : "",
        appRole: "user",
        updatedAt: Date.now(),
      };
      kvSet(`tenant_roster:${tenantId}:${auth.sub}`, entry);
      return ok({ success: true, profile: p });
    }
    if (mode === "create") {
      const tenantId = `tenant_${crypto.randomUUID()}`;
      const code = randomInvite();
      const org: TenantOrg = {
        tenantId,
        teams: [...DEFAULT_TEAMS],
        shifts: [...DEFAULT_SHIFTS],
        siteLocations: [...DEFAULT_LOCS],
        inviteCode: code,
        updatedAt: Date.now(),
      };
      kvSet(`tenant_org:${tenantId}`, org);
      kvSet(`invite_lookup:${code}`, { tenantId, createdAt: Date.now() });
      const p: UserProfile = {
        userId: auth.sub,
        email: auth.email,
        tenantId,
        appRole: "manager",
        displayName: typeof body.displayName === "string" ? body.displayName : "",
        updatedAt: Date.now(),
      };
      kvSet(`user_profile:${auth.sub}`, p);
      const entry: RosterEntry = {
        userId: auth.sub,
        email: p.email,
        displayName: p.displayName || p.email || "Manager",
        siteLocationId: DEFAULT_LOCS[0].id,
        teamId: DEFAULT_TEAMS[0].id,
        shiftId: DEFAULT_SHIFTS[0].id,
        appRole: "manager",
        updatedAt: Date.now(),
      };
      kvSet(`tenant_roster:${tenantId}:${auth.sub}`, entry);
      return ok({ success: true, profile: p, org });
    }
    return err(400, "Invalid body");
  }

  if (!profile) return err(403, "Complete onboarding first");

  const ctx = {
    userId: auth.sub,
    email: auth.email,
    tenantId: profile.tenantId,
    appRole: profile.appRole,
    profile,
  };

  // ── Org (manager) ──
  if (method === "PUT" && endpoint.startsWith("/org/roster/")) {
    if (ctx.appRole !== "manager") return err(403, "Forbidden");
    const orgCheck = readOrg(ctx.tenantId);
    if (!orgCheck) return err(404, "Organization not found");
    const uid = decodeURIComponent(endpoint.replace("/org/roster/", "").split("?")[0]);
    const target = parseKv(kvGet(`user_profile:${uid}`)) as UserProfile | null;
    if (!target || target.tenantId !== ctx.tenantId) return err(404, "User not in your organization");
    const existing = parseKv(kvGet(`tenant_roster:${ctx.tenantId}:${uid}`)) as RosterEntry | null;
    const entry: RosterEntry = {
      userId: uid,
      email: target.email,
      displayName: typeof body.displayName === "string" ? body.displayName : existing?.displayName ?? target.email,
      siteLocationId: typeof body.siteLocationId === "string" ? body.siteLocationId : existing?.siteLocationId ?? "",
      teamId: typeof body.teamId === "string" ? body.teamId : existing?.teamId ?? "",
      shiftId: typeof body.shiftId === "string" ? body.shiftId : existing?.shiftId ?? "",
      appRole: body.appRole === "manager" || body.appRole === "user" ? body.appRole : existing?.appRole ?? target.appRole,
      updatedAt: Date.now(),
    };
    kvSet(`tenant_roster:${ctx.tenantId}:${uid}`, entry);
    if (entry.appRole !== target.appRole) {
      kvSet(`user_profile:${uid}`, { ...target, appRole: entry.appRole, updatedAt: Date.now() });
    }
    return ok({ success: true, entry });
  }

  if (method === "PUT" && endpoint === "/org/settings") {
    if (ctx.appRole !== "manager") return err(403, "Forbidden");
    const org = readOrg(ctx.tenantId);
    if (!org) return err(404, "Organization not found");
    const updated: TenantOrg = {
      ...org,
      teams: Array.isArray(body.teams) ? body.teams : org.teams,
      shifts: Array.isArray(body.shifts) ? body.shifts : org.shifts,
      siteLocations: Array.isArray(body.siteLocations) ? body.siteLocations : org.siteLocations,
      updatedAt: Date.now(),
    };
    kvSet(`tenant_org:${ctx.tenantId}`, updated);
    return ok({ success: true, org: updated });
  }

  if (method === "POST" && endpoint === "/org/regenerate-invite") {
    if (ctx.appRole !== "manager") return err(403, "Forbidden");
    let org = readOrg(ctx.tenantId);
    if (!org) return err(404, "Organization not found");
    if (org.inviteCode) kvDel(`invite_lookup:${org.inviteCode}`);
    const code = randomInvite();
    kvSet(`invite_lookup:${code}`, { tenantId: ctx.tenantId, createdAt: Date.now() });
    org = { ...org, inviteCode: code, updatedAt: Date.now() };
    kvSet(`tenant_org:${ctx.tenantId}`, org);
    return ok({ success: true, org });
  }

  // ── Checklists ──
  const t = ctx.tenantId;
  const metaPrefix = `checklist_meta:${t}:`;

  if (method === "POST" && endpoint === "/checklists") {
    if (ctx.appRole !== "manager") return err(403, "Only managers can create checklists");
    const checklistId = body.id || `checklist_${Date.now()}_${crypto.randomUUID()}`;
    const checklist = {
      ...body,
      id: checklistId,
      createdBy: ctx.userId,
      createdByEmail: ctx.email,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      status: body.status || "draft",
    };
    const { fields: _f, ...meta } = checklist;
    kvSet(tenantKey("checklist", t, checklistId), checklist);
    kvSet(tenantKey("checklist_meta", t, checklistId), meta);
    return ok({ success: true, checklist });
  }

  if (method === "GET" && endpoint.startsWith("/checklists")) {
    const sp = new URLSearchParams(endpoint.includes("?") ? endpoint.split("?")[1] : "");
    const status = sp.get("status") || undefined;
    const createdBy = sp.get("createdBy") || undefined;
    if (createdBy && ctx.appRole !== "manager") return err(403, "Forbidden");
    let lists = kvByPrefix(metaPrefix)
      .map(parseKv)
      .filter((ch: any) => ch?.id && (!status || ch.status === status) && (!createdBy || ch.createdBy === createdBy));
    if (ctx.appRole === "user") {
      const ids = new Set<string>();
      kvByPrefix(`assignment:${t}:`).forEach((a) => {
        const x = parseKv(a);
        if (x?.assignedTo === ctx.userId && x?.checklistId) ids.add(x.checklistId);
      });
      lists = lists.filter(
        (ch: any) => ch.createdBy === ctx.userId || ch.assignedTo === ctx.userId || ids.has(ch.id),
      );
    }
    lists = lists.filter((ch: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === ch.id) === i);
    lists.sort((a: any, b: any) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    return ok({ checklists: lists, count: lists.length });
  }

  const m = endpoint.match(/^\/checklists\/([^/?]+)(\/publish)?$/);
  if (m) {
    const checklistId = m[1];
    const full = parseKv(kvGet(tenantKey("checklist", t, checklistId)));
    if (method === "GET" && !m[2]) {
      if (!full) return err(404, "Checklist not found");
      const allowed =
        ctx.appRole === "manager" ||
        full.createdBy === ctx.userId ||
        full.assignedTo === ctx.userId ||
        kvByPrefix(`assignment:${t}:`).some((a) => {
          const x = parseKv(a);
          return x?.checklistId === checklistId && x?.assignedTo === ctx.userId;
        });
      if (!allowed) return err(404, "Checklist not found");
      return ok({ checklist: full });
    }
    if (method === "PUT" && !m[2]) {
      if (ctx.appRole !== "manager") return err(403, "Forbidden");
      if (!full) return err(404, "Checklist not found");
      const { bypassDuplicateCheck: _b, ...safe } = body;
      const updated = {
        ...full,
        ...safe,
        id: checklistId,
        version: (full.version || 1) + 1,
        updatedAt: Date.now(),
        updatedBy: ctx.userId,
      };
      const { fields: _f2, ...meta } = updated;
      kvSet(tenantKey("checklist", t, checklistId), updated);
      kvSet(tenantKey("checklist_meta", t, checklistId), meta);
      return ok({ success: true, checklist: updated });
    }
    if (method === "DELETE" && !m[2]) {
      if (ctx.appRole !== "manager") return err(403, "Forbidden");
      if (!full) return err(404, "Checklist not found");
      kvDel(tenantKey("checklist", t, checklistId));
      kvDel(tenantKey("checklist_meta", t, checklistId));
      return ok({ success: true });
    }
    if (method === "POST" && m[2] === "/publish") {
      if (ctx.appRole !== "manager") return err(403, "Forbidden");
      if (!full) return err(404, "Checklist not found");
      const published = {
        ...full,
        status: "active",
        publishedAt: Date.now(),
        publishedBy: ctx.userId,
        managerUserId: full.managerUserId || ctx.userId,
        version: (full.version || 1) + 1,
        updatedAt: Date.now(),
      };
      const { fields: _f3, ...meta } = published;
      kvSet(tenantKey("checklist", t, checklistId), published);
      kvSet(tenantKey("checklist_meta", t, checklistId), meta);
      if (published.assignedTo) {
        const aid = `assignment_${Date.now()}_${crypto.randomUUID()}`;
        const asn = {
          id: aid,
          checklistId,
          assignedTo: published.assignedTo,
          assignedBy: ctx.userId,
          assignedAt: Date.now(),
          status: "pending",
          dueDate: null,
          completedAt: null,
          submissionId: null,
        };
        kvSet(tenantKey("assignment", t, aid), asn);
        const nid = `notification_${Date.now()}_${crypto.randomUUID()}`;
        kvSet(tenantKey("notification", t, nid), {
          id: nid,
          userId: published.assignedTo,
          type: "assignment",
          checklistId,
          assignmentId: aid,
          message: "You have been assigned a new checklist",
          createdAt: Date.now(),
          read: false,
        });
      }
      return ok({ success: true, checklist: published });
    }
  }

  // ── Assignments ──
  if (method === "GET" && endpoint.startsWith("/assignments")) {
    const sp = new URLSearchParams(endpoint.includes("?") ? endpoint.split("?")[1] : "");
    const st = sp.get("status");
    let list = kvByPrefix(`assignment:${t}:`)
      .map(parseKv)
      .filter((a: any) => a?.id && (!st || a.status === st))
      .sort((a: any, b: any) => b.assignedAt - a.assignedAt);
    if (ctx.appRole === "user") list = list.filter((a: any) => a.assignedTo === ctx.userId);
    const enriched = list.map((a: any) => {
      const meta = parseKv(kvGet(tenantKey("checklist_meta", t, a.checklistId)));
      return { ...a, checklist: meta ?? null };
    });
    return ok({ assignments: enriched, count: enriched.length });
  }

  const am = endpoint.match(/^\/assignments\/([^/?]+)$/);
  if (am && method === "GET") {
    const asn = parseKv(kvGet(tenantKey("assignment", t, am[1])));
    if (!asn) return err(404, "Assignment not found");
    if (ctx.appRole === "user" && asn.assignedTo !== ctx.userId) return err(403, "Forbidden");
    const checklist = parseKv(kvGet(tenantKey("checklist", t, asn.checklistId)));
    return ok({ assignment: { ...asn, checklist } });
  }

  if (method === "POST" && endpoint === "/assignments") {
    if (ctx.appRole !== "manager") return err(403, "Forbidden");
    const { checklistId, assignedTo, dueDate } = body;
    if (!checklistId || !assignedTo) return err(400, "Missing fields");
    if (!kvGet(tenantKey("checklist", t, checklistId))) return err(404, "Checklist not found");
    const aid = `assignment_${Date.now()}_${crypto.randomUUID()}`;
    const asn: any = {
      id: aid,
      checklistId,
      assignedTo,
      assignedBy: ctx.userId,
      assignedAt: Date.now(),
      status: "pending",
      dueDate: dueDate ?? null,
      completedAt: null,
      submissionId: null,
    };
    kvSet(tenantKey("assignment", t, aid), asn);
    return ok({ success: true, assignment: asn });
  }

  // ── Submissions (simplified) ──
  function submissionMeta(s: any) {
    const { answers: _a, ...m } = s;
    return m;
  }

  if (method === "POST" && endpoint === "/submissions") {
    const { checklistId, assignmentId, answers, status } = body;
    if (!checklistId || !answers) return err(400, "Missing fields");
    const sid = `submission_${Date.now()}_${crypto.randomUUID()}`;
    const sub = {
      id: sid,
      checklistId,
      assignmentId: assignmentId || null,
      submittedBy: ctx.userId,
      submittedByEmail: ctx.email,
      submittedAt: Date.now(),
      status: status || "submitted",
      answers,
      totalScore: 0,
    };
    kvSet(tenantKey("submission", t, sid), sub);
    kvSet(tenantKey("submission_meta", t, sid), submissionMeta(sub));
    if (assignmentId) {
      const asn = parseKv(kvGet(tenantKey("assignment", t, assignmentId)));
      if (asn) kvSet(tenantKey("assignment", t, assignmentId), { ...asn, status: "completed", completedAt: Date.now(), submissionId: sid });
    }
    const ch = parseKv(kvGet(tenantKey("checklist", t, checklistId)));
    if (ch?.validateChecklist && ch?.managerUserId) {
      const nid = `notification_${Date.now()}_${crypto.randomUUID()}`;
      kvSet(tenantKey("notification", t, nid), {
        id: nid,
        userId: ch.managerUserId,
        type: "validation_required",
        checklistId,
        submissionId: sid,
        message: "A checklist was submitted for validation",
        createdAt: Date.now(),
        read: false,
      });
    }
    return ok({ success: true, submission: sub });
  }

  if (method === "GET" && endpoint.startsWith("/submissions")) {
    const sp = new URLSearchParams(endpoint.includes("?") ? endpoint.split("?")[1] : "");
    let list = kvByPrefix(`submission_meta:${t}:`)
      .map(parseKv)
      .filter((s: any) => {
        if (!s?.id) return false;
        if (sp.get("checklistId") && s.checklistId !== sp.get("checklistId")) return false;
        if (sp.get("status") && s.status !== sp.get("status")) return false;
        if (sp.get("assignmentId") && s.assignmentId !== sp.get("assignmentId")) return false;
        return true;
      });
    if (ctx.appRole === "user") list = list.filter((s: any) => s.submittedBy === ctx.userId);
    list = list.filter((s: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === s.id) === i);
    list.sort((a: any, b: any) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0));
    return ok({ submissions: list, count: list.length });
  }

  const sm = endpoint.match(/^\/submissions\/([^/?]+)(\/validate)?$/);
  if (sm) {
    const sid = sm[1];
    const sub = parseKv(kvGet(tenantKey("submission", t, sid)));
    if (method === "GET" && !sm[2]) {
      if (!sub) return err(404, "Not found");
      if (ctx.appRole === "user" && sub.submittedBy !== ctx.userId) return err(403, "Forbidden");
      return ok({ submission: sub });
    }
    if (method === "PUT" && !sm[2]) {
      if (!sub) return err(404, "Not found");
      if (sub.submittedBy !== ctx.userId && ctx.appRole !== "manager") return err(403, "Forbidden");
      const updated = { ...sub, ...body, id: sid, updatedAt: Date.now() };
      kvSet(tenantKey("submission", t, sid), updated);
      kvSet(tenantKey("submission_meta", t, sid), submissionMeta(updated));
      return ok({ success: true, submission: updated });
    }
    if (method === "PUT" && sm[2] === "/validate") {
      if (ctx.appRole !== "manager") return err(403, "Forbidden");
      if (!sub) return err(404, "Not found");
      const updated = { ...sub, status: body.status, validatedBy: ctx.userId, validatedAt: Date.now(), validationComments: body.comments };
      kvSet(tenantKey("submission", t, sid), updated);
      kvSet(tenantKey("submission_meta", t, sid), submissionMeta(updated));
      return ok({ success: true, submission: updated });
    }
  }

  // ── Notifications ──
  if (method === "GET" && endpoint.startsWith("/notifications")) {
    const sp = new URLSearchParams(endpoint.includes("?") ? endpoint.split("?")[1] : "");
    const uid = ctx.appRole === "manager" ? sp.get("userId") : ctx.userId;
    let list = kvByPrefix(`notification:${t}:`)
      .map(parseKv)
      .filter((n: any) => n?.userId && (!uid || n.userId === uid) && (!sp.get("unread") || sp.get("unread") !== "true" || !n.read));
    if (ctx.appRole === "manager" && !sp.get("userId")) list = list.filter((n: any) => n.userId === ctx.userId);
    list.sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return ok({ notifications: list, count: list.length });
  }

  const nm = endpoint.match(/^\/notifications\/([^/?]+)\/read$/);
  if (nm && method === "PUT") {
    const n = parseKv(kvGet(tenantKey("notification", t, nm[1])));
    if (!n) return err(404, "Not found");
    if (n.userId !== ctx.userId) return err(403, "Forbidden");
    const u = { ...n, read: true, readAt: Date.now() };
    kvSet(tenantKey("notification", t, nm[1]), u);
    return ok({ success: true, notification: u });
  }

  // ── Tags / immediate-actions / closure / action-items / risk (POST only used by UI) ──
  if (method === "POST" && endpoint === "/tags") {
    const tagId = `tag_${Date.now()}_${crypto.randomUUID()}`;
    const tag = { ...body, id: tagId, createdBy: ctx.userId, createdAt: Date.now(), status: "open" };
    const { attachments: _a, ...meta } = tag;
    kvSet(tenantKey("tag", t, tagId), tag);
    kvSet(tenantKey("tag_meta", t, tagId), meta);
    return ok({ success: true, tag });
  }

  if (method === "POST" && endpoint === "/immediate-actions") {
    const actionId = `ia_${Date.now()}_${crypto.randomUUID()}`;
    const action = { ...body, id: actionId, createdBy: ctx.userId, createdAt: Date.now(), status: "open" };
    kvSet(tenantKey("immediate_action", t, actionId), action);
    kvSet(tenantKey("immediate_action_meta", t, actionId), { ...action, attachments: undefined });
    return ok({ success: true, action });
  }

  if (method === "POST" && endpoint === "/closure-events") {
    const id = `closure_${Date.now()}_${crypto.randomUUID()}`;
    const rec = { ...body, id, createdBy: ctx.userId, createdAt: Date.now(), status: "open" };
    kvSet(tenantKey("closure_event", t, id), rec);
    return ok({ success: true, closureEvent: rec });
  }

  if (method === "POST" && endpoint === "/action-items") {
    const id = `action_item_${Date.now()}_${crypto.randomUUID()}`;
    const rec = { ...body, id, createdBy: ctx.userId, createdAt: Date.now(), status: "open" };
    kvSet(tenantKey("action_item", t, id), rec);
    return ok({ success: true, actionItem: rec });
  }

  if (method === "POST" && endpoint === "/risk-assessments") {
    const id = `risk_${Date.now()}_${crypto.randomUUID()}`;
    const rec = { ...body, id, createdBy: ctx.userId, createdAt: Date.now(), status: "open", riskLevel: "medium" };
    kvSet(tenantKey("risk_assessment", t, id), rec);
    return ok({ success: true, riskAssessment: rec });
  }

  return err(404, "Not found");
}
