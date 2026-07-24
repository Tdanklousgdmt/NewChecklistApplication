/**
 * Local demo backend (no Supabase required).
 *
 * The app's original Supabase project no longer exists (NXDOMAIN), so every
 * call to the Edge function fails. When `VITE_DEMO_MODE=true`, checklistService
 * routes all `apiFetch` calls here instead. Data is generated once and persisted
 * in localStorage, so the dashboard and Reports page are fully populated and the
 * app stays usable (create / submit / validate all work locally).
 *
 * To go back to a real backend: set VITE_DEMO_MODE=false (or remove it) and point
 * utils/supabase/info.tsx at a live project.
 */

const STORAGE_KEY = "echeck_demo_db_v3";

const MANAGER_ID = "00000000-0000-4000-8000-000000000001";
const MANAGER_EMAIL = "anonymous@local";
const OPERATOR_ID = "00000000-0000-4000-8000-000000000002";

const DAY = 86400000;

/**
 * Is the local demo backend active?
 *
 * Defaults to ON because the app's original Supabase project no longer exists
 * (both referenced project refs return NXDOMAIN), so every real API call fails.
 * Opt back out — once you point utils/supabase/info.tsx at a live project — with
 * `VITE_DEMO_MODE=false`, or at runtime via localStorage.setItem('echeck_demo','0').
 */
export function isDemoMode(): boolean {
  try {
    const flag = import.meta.env?.VITE_DEMO_MODE;
    if (flag === "false" || flag === false) return false;
  } catch {
    /* ignore */
  }
  try {
    if (typeof localStorage !== "undefined") {
      const ls = localStorage.getItem("echeck_demo");
      if (ls === "0") return false;
      if (ls === "1") return true;
    }
  } catch {
    /* ignore */
  }
  return true;
}

// ── Types kept intentionally loose — this mirrors the KV store's untyped JSON ──
type Dict = Record<string, any>;

interface DemoDb {
  checklists: Dict[]; // full records (incl. fields/canvasFields)
  submissions: Dict[];
  assignments: Dict[];
  notifications: Dict[];
  tags: Dict[];
  immediateActions: Dict[];
  org: Dict;
  roster: Dict[];
}

// ── Small RNG helpers ──────────────────────────────────────────────────────────
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const weighted = (pairs: [string, number][]): string => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [value, w] of pairs) if ((r -= w) <= 0) return value;
  return pairs[pairs.length - 1][0];
};
const uid = (p = "id") => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

function field(typeId: string, label: string, extra: Dict = {}): Dict {
  return { uid: uid("f"), typeId, label, category: "input", required: false, ...extra };
}

// ── Seed content ────────────────────────────────────────────────────────────────
const OPERATORS = [
  { userId: OPERATOR_ID, email: "operator@local" },
  { userId: "00000000-0000-4000-8000-000000000003", email: "amelia.jones@plant.local" },
  { userId: "00000000-0000-4000-8000-000000000004", email: "raj.patel@plant.local" },
  { userId: "00000000-0000-4000-8000-000000000005", email: "sofia.garcia@plant.local" },
  { userId: "00000000-0000-4000-8000-000000000006", email: "liam.chen@plant.local" },
  { userId: "00000000-0000-4000-8000-000000000007", email: "noah.dubois@plant.local" },
];

const LOCATIONS = ["Building A", "Building B", "Warehouse", "Production Line 1", "Production Line 2", "Loading Dock"];

const CHECKLIST_TEMPLATES: Array<{ title: string; category: string; priority: string; fields: Dict[]; status?: string }> = [
  { title: "Daily Safety Inspection", category: "Safety", priority: "high", fields: [
    field("text", "Inspector Name"),
    field("radio", "PPE Compliance?", { options: [{ label: "Yes", score: 10 }, { label: "No", score: 0 }] }),
    field("numeric", "Ambient Temperature", { min: 18, max: 24, unit: "°C" }),
  ] },
  { title: "Machine Maintenance Check", category: "Maintenance", priority: "normal", fields: [
    field("text", "Technician Name"), field("checkbox", "Lubrication Done"), field("textarea", "Notes"),
  ] },
  { title: "Quality Control Audit", category: "Quality", priority: "high", fields: [
    field("text", "Auditor Name"),
    field("radio", "Batch Within Tolerance?", { options: [{ label: "Yes", score: 10 }, { label: "No", score: 0 }] }),
    field("numeric", "Defect Count", { min: 0, max: 100 }),
  ] },
  { title: "Fire Safety Compliance", category: "Compliance", priority: "urgent", fields: [
    field("text", "Officer Name"), field("checkbox", "Extinguishers Charged"), field("checkbox", "Exits Clear"),
  ] },
  { title: "Housekeeping & 5S", category: "Operations", priority: "normal", fields: [
    field("text", "Supervisor Name"),
    field("radio", "Area Clean?", { options: [{ label: "Yes", score: 10 }, { label: "No", score: 0 }] }),
    field("textarea", "Observations"),
  ] },
  { title: "Forklift Pre-Use Inspection", category: "Safety", priority: "high", fields: [
    field("text", "Operator Name"), field("checkbox", "Brakes OK"), field("checkbox", "Horn OK"),
    field("numeric", "Fuel Level", { min: 0, max: 100, unit: "%" }),
  ] },
  { title: "Product Line Changeover", category: "Operations", priority: "normal", fields: [
    field("text", "Line Lead"), field("checkbox", "Tooling Verified"), field("textarea", "Downtime Notes"),
  ] },
  { title: "Environmental Waste Log", category: "Compliance", priority: "normal", fields: [
    field("text", "Recorder Name"), field("numeric", "Waste (kg)", { min: 0, max: 1000, unit: "kg" }),
    field("radio", "Disposed Correctly?", { options: [{ label: "Yes", score: 10 }, { label: "No", score: 0 }] }),
  ] },
  { title: "Cold Chain Temperature Log", category: "Quality", priority: "high", fields: [
    field("text", "Recorder"), field("numeric", "Cooler Temp", { min: -20, max: 8, unit: "°C" }),
    field("radio", "Within Range?", { options: [{ label: "Yes", score: 10 }, { label: "No", score: 0 }] }),
  ] },
  { title: "Electrical Panel Inspection", category: "Maintenance", priority: "high", fields: [
    field("text", "Electrician"), field("checkbox", "No Exposed Wiring"), field("checkbox", "Breakers Labeled"),
  ] },
  { title: "New Hire Safety Induction", category: "HR", priority: "normal", fields: [
    field("text", "Trainer"), field("checkbox", "Emergency Exits Shown"),
    field("radio", "Quiz Passed?", { options: [{ label: "Yes", score: 10 }, { label: "No", score: 0 }] }),
  ] },
  { title: "PPE Stock Verification", category: "HR", priority: "low", fields: [
    field("text", "Store Keeper"), field("numeric", "Helmets in Stock", { min: 0, max: 200 }),
    field("numeric", "Gloves in Stock", { min: 0, max: 500 }),
  ] },
  { title: "Loading Dock Safety Check", category: "Safety", priority: "high", fields: [
    field("text", "Dock Supervisor"), field("checkbox", "Wheel Chocks Placed"),
    field("radio", "Trailer Secured?", { options: [{ label: "Yes", score: 10 }, { label: "No", score: 0 }] }),
  ] },
  { title: "Monthly Compressor Service", category: "Maintenance", priority: "normal", fields: [
    field("text", "Technician"), field("numeric", "Pressure (bar)", { min: 0, max: 12, unit: "bar" }),
    field("checkbox", "Filter Replaced"),
  ] },
  // Two drafts so the "Drafts" counter is non-zero.
  { title: "Water Treatment Log", category: "Compliance", priority: "normal", status: "draft", fields: [
    field("text", "Operator"), field("numeric", "pH Level", { min: 6, max: 9 }),
  ] },
  { title: "Annual Ergonomics Review", category: "HR", priority: "low", status: "draft", fields: [
    field("text", "Assessor"), field("textarea", "Findings"),
  ] },
];

function buildChecklist(tpl: (typeof CHECKLIST_TEMPLATES)[number], idx: number): Dict {
  const createdAt = Date.now() - rand(20, 60) * DAY;
  const status = tpl.status ?? "active";
  return {
    id: `checklist_seed_${idx}_${Math.random().toString(36).slice(2, 8)}`,
    title: tpl.title,
    category: tpl.category,
    priority: tpl.priority,
    frequency: "RECURRING",
    status,
    validateChecklist: true,
    validationRequired: true,
    assignedTo: "All",
    location: pick(LOCATIONS),
    createdBy: MANAGER_ID,
    createdByEmail: MANAGER_EMAIL,
    managerName: "Plant Manager",
    managerUserId: MANAGER_ID,
    createdAt,
    updatedAt: createdAt,
    publishedAt: status === "active" ? createdAt : undefined,
    version: 1,
    fields: tpl.fields,
    canvasFields: tpl.fields,
  };
}

function buildSubmission(checklist: Dict, seq: number): Dict {
  const operator = pick(OPERATORS);
  const status = weighted([["validated", 6], ["submitted", 2], ["rejected", 1]]);
  const submittedAt = Date.now() - rand(0, 29) * DAY - rand(0, 23) * 3600000;
  const answers = (checklist.fields || []).map((f: Dict) => {
    let score = 0;
    let value: any = "";
    if (f.typeId === "radio" && Array.isArray(f.options)) {
      const opt = status === "rejected" ? f.options[f.options.length - 1] : f.options[0];
      score = typeof opt?.score === "number" ? opt.score : 0;
      value = opt?.label ?? "";
    } else if (f.typeId === "checkbox") {
      const checked = status !== "rejected" || Math.random() > 0.4;
      score = checked ? 5 : 0;
      value = checked;
    } else if (f.typeId === "numeric") {
      value = rand(f.min ?? 0, f.max ?? 100);
    } else {
      value = "Sample entry";
    }
    return { uid: f.uid, label: f.label, typeId: f.typeId, value, score };
  });
  const totalScore = answers.reduce((t: number, a: Dict) => t + (typeof a.score === "number" ? a.score : 0), 0);
  return {
    id: `submission_seed_${checklist.id}_${seq}`,
    checklistId: checklist.id,
    assignmentId: null,
    submittedBy: operator.userId,
    submittedByEmail: operator.email,
    submittedAt,
    status,
    answers,
    totalScore,
    location: checklist.location,
    attachments: [],
    signature: null,
    ...(status === "validated" || status === "rejected"
      ? { validatedBy: MANAGER_ID, validatedAt: submittedAt + rand(1, 12) * 3600000 }
      : {}),
    ...(status === "rejected" ? { validationComments: "Please review flagged items and resubmit." } : {}),
  };
}

function seed(): DemoDb {
  const checklists = CHECKLIST_TEMPLATES.map(buildChecklist);
  const submissions: Dict[] = [];
  for (const c of checklists) {
    if (c.status !== "active") continue; // drafts get no submissions
    const n = rand(12, 26);
    for (let s = 0; s < n; s++) submissions.push(buildSubmission(c, s));
  }
  // One pending assignment to the operator so their "Pending Tasks" isn't empty.
  const firstActive = checklists.find((c) => c.status === "active")!;
  const assignmentId = uid("assignment");
  const assignments: Dict[] = [{
    id: assignmentId,
    checklistId: firstActive.id,
    assignedTo: OPERATOR_ID,
    assignedBy: MANAGER_ID,
    assignedAt: Date.now() - 2 * DAY,
    status: "pending",
    dueDate: null,
    completedAt: null,
    submissionId: null,
  }];
  const notifications: Dict[] = [{
    id: uid("notification"),
    userId: OPERATOR_ID,
    type: "assignment",
    checklistId: firstActive.id,
    assignmentId,
    message: "You have been assigned a new checklist",
    createdAt: Date.now() - 2 * DAY,
    read: false,
  }];

  return {
    checklists,
    submissions,
    assignments,
    notifications,
    tags: [],
    immediateActions: [],
    org: {
      tenantId: "tenant_anonymous_shared",
      teams: [{ id: "TM_SAFETY", name: "Safety Team" }, { id: "TM_MAINT", name: "Maintenance Team" }, { id: "TM_OPS", name: "Operations Team" }],
      shifts: [{ id: "SHIFT_A", name: "Shift A (Day)" }, { id: "SHIFT_B", name: "Shift B (Evening)" }, { id: "SHIFT_C", name: "Shift C (Night)" }],
      siteLocations: [{ id: "site_north", label: "North Plant" }, { id: "site_south", label: "South Plant" }, { id: "site_warehouse", label: "Warehouse" }],
      inviteCode: "DEMO2024",
      updatedAt: Date.now(),
    },
    roster: [
      { userId: MANAGER_ID, email: MANAGER_EMAIL, displayName: "Guest", appRole: "manager", updatedAt: Date.now() },
      ...OPERATORS.map((o) => ({ userId: o.userId, email: o.email, displayName: o.email.split("@")[0], appRole: "user", updatedAt: Date.now() })),
    ],
  };
}

// ── Persistence ─────────────────────────────────────────────────────────────────
let cache: DemoDb | null = null;

function db(): DemoDb {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cache = JSON.parse(raw) as DemoDb;
      return cache;
    }
  } catch {
    /* ignore */
  }
  cache = seed();
  save();
  return cache;
}

function save() {
  if (!cache) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* localStorage full — keep in-memory only */
  }
}

/** Wipe and re-seed (exposed for a console helper / "reset demo data"). */
export function reseedDemoData() {
  cache = seed();
  save();
  return { checklists: cache.checklists.length, submissions: cache.submissions.length };
}

const light = (c: Dict) => { const { fields: _f, ...meta } = c; return meta; };
const subMeta = (s: Dict) => { const { answers: _a, ...meta } = s; return meta; };

// ── Router ───────────────────────────────────────────────────────────────────────
type Result = { status: number; body: any };
const ok = (body: any): Result => ({ status: 200, body });
const err = (status: number, error: string, extra: Dict = {}): Result => ({ status, body: { error, ...extra } });

function role(headers?: Record<string, string>): "manager" | "user" {
  const r = (headers?.["X-App-Role"] || headers?.["x-app-role"] || "manager").toLowerCase();
  return r === "user" ? "user" : "manager";
}
const currentUserId = (r: "manager" | "user") => (r === "user" ? OPERATOR_ID : MANAGER_ID);
const currentEmail = (r: "manager" | "user") => (r === "user" ? "operator@local" : MANAGER_EMAIL);

export async function mockRouter(
  endpoint: string,
  method: string,
  body: any,
  headers?: Record<string, string>,
): Promise<Result> {
  const url = new URL(endpoint, "http://mock.local");
  const path = url.pathname.replace(/\/$/, "");
  const q = url.searchParams;
  const m = method.toUpperCase();
  const store = db();
  const r = role(headers);

  // ── CHECKLISTS ──
  if (path === "/checklists" && m === "GET") {
    const status = q.get("status");
    const createdBy = q.get("createdBy");
    let list = store.checklists.map(light).filter((c) => {
      if (status && c.status !== status) return false;
      if (createdBy && c.createdBy !== createdBy) return false;
      return true;
    });
    if (r === "user") {
      const asnIds = new Set(store.assignments.filter((a) => a.assignedTo === OPERATOR_ID).map((a) => a.checklistId));
      list = list.filter((c) => c.createdBy === OPERATOR_ID || c.assignedTo === OPERATOR_ID || asnIds.has(c.id));
    }
    list.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    return ok({ checklists: list, count: list.length });
  }
  if (path === "/checklists" && m === "POST") {
    const id = body?.id || uid("checklist");
    const checklist = {
      ...body,
      id,
      createdBy: currentUserId(r),
      createdByEmail: currentEmail(r),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      status: body?.status || "draft",
      canvasFields: body?.canvasFields || body?.fields || [],
      fields: body?.fields || body?.canvasFields || [],
    };
    store.checklists.push(checklist);
    save();
    return ok({ success: true, checklist });
  }
  const clId = path.match(/^\/checklists\/([^/]+)$/)?.[1];
  if (clId) {
    const idx = store.checklists.findIndex((c) => c.id === clId);
    if (m === "GET") {
      if (idx < 0) return err(404, "Checklist not found");
      return ok({ checklist: store.checklists[idx] });
    }
    if (m === "PUT") {
      if (idx < 0) return err(404, "Checklist not found");
      const updated = { ...store.checklists[idx], ...body, id: clId, version: (store.checklists[idx].version ?? 1) + 1, updatedAt: Date.now() };
      store.checklists[idx] = updated;
      save();
      return ok({ success: true, checklist: updated });
    }
    if (m === "DELETE") {
      if (idx < 0) return err(404, "Checklist not found");
      store.checklists.splice(idx, 1);
      save();
      return ok({ success: true });
    }
  }
  const publishId = path.match(/^\/checklists\/([^/]+)\/publish$/)?.[1];
  if (publishId && m === "POST") {
    const idx = store.checklists.findIndex((c) => c.id === publishId);
    if (idx < 0) return err(404, "Checklist not found");
    const published = { ...store.checklists[idx], status: "active", publishedAt: Date.now(), version: (store.checklists[idx].version ?? 1) + 1, updatedAt: Date.now() };
    store.checklists[idx] = published;
    save();
    return ok({ success: true, checklist: published });
  }

  // ── ASSIGNMENTS ──
  if (path === "/assignments" && m === "GET") {
    const status = q.get("status");
    let list = store.assignments.filter((a) => (!status || a.status === status));
    if (r === "user") list = list.filter((a) => a.assignedTo === OPERATOR_ID);
    const enriched = list
      .sort((a, b) => b.assignedAt - a.assignedAt)
      .map((a) => ({ ...a, checklist: light(store.checklists.find((c) => c.id === a.checklistId) || {}) }));
    return ok({ assignments: enriched, count: enriched.length });
  }
  if (path === "/assignments" && m === "POST") {
    const assignment = {
      id: uid("assignment"), checklistId: body?.checklistId, assignedTo: body?.assignedTo || OPERATOR_ID,
      assignedBy: currentUserId(r), assignedAt: Date.now(), status: "pending", dueDate: body?.dueDate || null,
      completedAt: null, submissionId: null,
    };
    store.assignments.push(assignment);
    save();
    return ok({ success: true, assignment });
  }
  const asnId = path.match(/^\/assignments\/([^/]+)$/)?.[1];
  if (asnId && m === "GET") {
    const a = store.assignments.find((x) => x.id === asnId);
    if (!a) return err(404, "Assignment not found");
    return ok({ assignment: { ...a, checklist: store.checklists.find((c) => c.id === a.checklistId) || null } });
  }

  // ── SUBMISSIONS ──
  if (path === "/submissions" && m === "GET") {
    const checklistId = q.get("checklistId");
    const status = q.get("status");
    const assignmentId = q.get("assignmentId");
    let list = store.submissions.map(subMeta).filter((s) => {
      if (checklistId && s.checklistId !== checklistId) return false;
      if (status && s.status !== status) return false;
      if (assignmentId && s.assignmentId !== assignmentId) return false;
      return true;
    });
    if (r === "user") list = list.filter((s) => s.submittedBy === OPERATOR_ID);
    list.sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0));
    return ok({ submissions: list, count: list.length });
  }
  if (path === "/submissions" && m === "POST") {
    const answers = body?.answers || [];
    const totalScore = answers.reduce((t: number, a: Dict) => t + (typeof a.score === "number" ? a.score : 0), 0);
    const submission = {
      id: uid("submission"), checklistId: body?.checklistId, assignmentId: body?.assignmentId || null,
      submittedBy: currentUserId(r), submittedByEmail: currentEmail(r), submittedAt: Date.now(),
      status: body?.status || "submitted", answers, totalScore, location: null, attachments: [], signature: null,
    };
    store.submissions.push(submission);
    if (submission.assignmentId) {
      const a = store.assignments.find((x) => x.id === submission.assignmentId);
      if (a) { a.status = "completed"; a.completedAt = Date.now(); a.submissionId = submission.id; }
    }
    save();
    return ok({ success: true, submission });
  }
  const subId = path.match(/^\/submissions\/([^/]+)$/)?.[1];
  if (subId && m === "GET") {
    const s = store.submissions.find((x) => x.id === subId);
    if (!s) return err(404, "Submission not found");
    return ok({ submission: s });
  }
  if (subId && m === "PUT") {
    const idx = store.submissions.findIndex((x) => x.id === subId);
    if (idx < 0) return err(404, "Submission not found");
    const updated = { ...store.submissions[idx], ...body, id: subId, updatedAt: Date.now() };
    if (body?.answers) updated.totalScore = body.answers.reduce((t: number, a: Dict) => t + (typeof a.score === "number" ? a.score : 0), 0);
    store.submissions[idx] = updated;
    save();
    return ok({ success: true, submission: updated });
  }
  const validateId = path.match(/^\/submissions\/([^/]+)\/validate$/)?.[1];
  if (validateId && m === "PUT") {
    const idx = store.submissions.findIndex((x) => x.id === validateId);
    if (idx < 0) return err(404, "Submission not found");
    const updated = { ...store.submissions[idx], status: body?.status, validatedBy: currentUserId(r), validatedAt: Date.now(), validationComments: body?.comments };
    store.submissions[idx] = updated;
    save();
    return ok({ success: true, submission: updated });
  }

  // ── NOTIFICATIONS ──
  if (path === "/notifications" && m === "GET") {
    const unreadOnly = q.get("unread") === "true";
    const userIdFilter = r === "manager" ? q.get("userId") : OPERATOR_ID;
    let list = store.notifications.filter((n) => {
      if (userIdFilter && n.userId !== userIdFilter) return false;
      if (unreadOnly && n.read) return false;
      return true;
    });
    if (r === "manager" && !q.get("userId")) list = list.filter((n) => n.userId === MANAGER_ID);
    list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return ok({ notifications: list, count: list.length });
  }
  const notifReadId = path.match(/^\/notifications\/([^/]+)\/read$/)?.[1];
  if (notifReadId && m === "PUT") {
    const n = store.notifications.find((x) => x.id === notifReadId);
    if (n) { n.read = true; n.readAt = Date.now(); save(); }
    return ok({ success: true, notification: n });
  }
  const notifDelId = path.match(/^\/notifications\/([^/]+)$/)?.[1];
  if (notifDelId && m === "DELETE") {
    store.notifications = store.notifications.filter((x) => x.id !== notifDelId);
    save();
    return ok({ success: true });
  }

  // ── TAGS / IMMEDIATE ACTIONS (read-mostly; return what we have) ──
  if (path === "/tags" && m === "GET") {
    const checklistId = q.get("checklistId");
    const list = store.tags.filter((t) => !checklistId || t.checklistId === checklistId);
    return ok({ tags: list, count: list.length });
  }
  if (path === "/tags" && m === "POST") {
    const tag = { id: uid("tag"), ...body, createdBy: currentUserId(r), createdAt: Date.now(), status: "open" };
    store.tags.push(tag);
    save();
    return ok({ success: true, tag });
  }
  if (path === "/immediate-actions" && m === "GET") {
    const checklistId = q.get("checklistId");
    const list = store.immediateActions.filter((a) => !checklistId || a.checklistId === checklistId);
    return ok({ actions: list, count: list.length });
  }
  if (path === "/immediate-actions" && m === "POST") {
    const action = { id: uid("ia"), ...body, createdBy: currentUserId(r), createdAt: Date.now(), status: "open" };
    store.immediateActions.push(action);
    save();
    return ok({ success: true, action });
  }

  // ── ORG ──
  if (path === "/org/settings" && m === "GET") return ok({ org: store.org });
  if (path === "/org/settings" && m === "PUT") { store.org = { ...store.org, ...body, updatedAt: Date.now() }; save(); return ok({ success: true, org: store.org }); }
  if (path === "/org/roster" && m === "GET") return ok({ roster: store.roster });
  if (path.startsWith("/org/roster/") && m === "PUT") return ok({ success: true });
  if (path === "/org/regenerate-invite" && m === "POST") { store.org.inviteCode = uid("INV").toUpperCase().slice(0, 8); save(); return ok({ success: true, org: store.org }); }

  // Unknown endpoint — return empty-ish success so the UI degrades gracefully.
  console.warn(`[mockBackend] Unhandled ${m} ${path} — returning empty result`);
  return ok({ success: true, items: [], count: 0 });
}
