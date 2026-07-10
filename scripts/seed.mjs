/**
 * Seed script — inserts sample data directly into the Supabase KV store
 * (table `kv_store_d5ac9b81`) so it shows up in the app.
 *
 * Keys match the format the server uses (see server/context.ts -> tenantKey):
 *   checklist:<tenantId>:<id>        full record (with fields)
 *   checklist_meta:<tenantId>:<id>   lightweight record (no fields) used for lists
 *
 * The app's anonymous/demo mode uses the shared tenant below, so seeded
 * checklists appear immediately without creating any account.
 *
 * USAGE (PowerShell):
 *   $env:SUPABASE_URL="https://<your-project>.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
 *   node scripts/seed.mjs
 */

import { createClient } from "@supabase/supabase-js";

const TABLE = "kv_store_d5ac9b81";

// Must match server/context.ts anonymous/demo identifiers.
const TENANT_ID = "tenant_anonymous_shared";
const MANAGER_USER_ID = "00000000-0000-4000-8000-000000000001";
const OPERATOR_USER_ID = "00000000-0000-4000-8000-000000000002";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.\n" +
      'PowerShell:\n  $env:SUPABASE_URL="https://<project>.supabase.co"\n' +
      '  $env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const tenantKey = (prefix, id) => `${prefix}:${TENANT_ID}:${id}`;

const DAY = 86400000;

// Small random helpers used to build a realistic-looking dataset.
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const weighted = (pairs) => {
  // pairs: [[value, weight], ...]
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [value, w] of pairs) {
    if ((r -= w) <= 0) return value;
  }
  return pairs[pairs.length - 1][0];
};

function field(typeId, label, extra = {}) {
  return {
    uid: `f_${Math.random().toString(36).slice(2, 10)}`,
    typeId,
    label,
    category: "input",
    required: false,
    ...extra,
  };
}

/** Build a full checklist record + its meta counterpart. */
function makeChecklist(idx, title, category, priority, fields) {
  const id = `checklist_seed_${idx}_${Date.now()}`;
  // Created 20–60 days ago so trends look natural.
  const createdAt = Date.now() - rand(20, 60) * DAY;
  const full = {
    id,
    title,
    category,
    priority,
    frequency: "RECURRING",
    // The Reports page + server list filter on status === "active".
    status: "active",
    validateChecklist: true,
    validationRequired: true,
    assignedTo: "All",
    location: pick(["Building A", "Building B", "Warehouse", "Production Line 1", "Production Line 2"]),
    createdBy: MANAGER_USER_ID,
    createdByEmail: "guest@local",
    managerName: "Plant Manager",
    managerUserId: MANAGER_USER_ID,
    createdAt,
    updatedAt: createdAt,
    version: 1,
    fields,
    canvasFields: fields,
  };
  // meta = everything except `fields`
  const { fields: _omit, ...meta } = full;
  return { id, category, full, meta };
}

// Operators that "submit" checklists — drives the per-user report table.
const OPERATORS = [
  { userId: OPERATOR_USER_ID, email: "operator@local" },
  { userId: "00000000-0000-4000-8000-000000000003", email: "amelia.jones@plant.local" },
  { userId: "00000000-0000-4000-8000-000000000004", email: "raj.patel@plant.local" },
  { userId: "00000000-0000-4000-8000-000000000005", email: "sofia.garcia@plant.local" },
  { userId: "00000000-0000-4000-8000-000000000006", email: "liam.chen@plant.local" },
];

// Categories chosen to match the report's colour map
// (Safety, Quality, Maintenance, Compliance, HR, Operations).
const checklists = [
  makeChecklist(1, "Daily Safety Inspection", "Safety", "high", [
    field("text", "Inspector Name"),
    field("radio", "PPE Compliance?", { options: [{ label: "Yes", score: 10 }, { label: "No", score: 0 }] }),
    field("numeric", "Ambient Temperature", { min: 18, max: 24, unit: "°C" }),
  ]),
  makeChecklist(2, "Machine Maintenance Check", "Maintenance", "normal", [
    field("text", "Technician Name"),
    field("checkbox", "Lubrication Done"),
    field("textarea", "Notes"),
  ]),
  makeChecklist(3, "Quality Control Audit", "Quality", "high", [
    field("text", "Auditor Name"),
    field("radio", "Batch Within Tolerance?", { options: [{ label: "Yes", score: 10 }, { label: "No", score: 0 }] }),
    field("numeric", "Defect Count", { min: 0, max: 100 }),
  ]),
  makeChecklist(4, "Fire Safety Compliance", "Compliance", "urgent", [
    field("text", "Officer Name"),
    field("checkbox", "Extinguishers Charged"),
    field("checkbox", "Exits Clear"),
  ]),
  makeChecklist(5, "Housekeeping & 5S", "Operations", "normal", [
    field("text", "Supervisor Name"),
    field("radio", "Area Clean?", { options: [{ label: "Yes", score: 10 }, { label: "No", score: 0 }] }),
    field("textarea", "Observations"),
  ]),
  makeChecklist(6, "Forklift Pre-Use Inspection", "Safety", "high", [
    field("text", "Operator Name"),
    field("checkbox", "Brakes OK"),
    field("checkbox", "Horn OK"),
    field("numeric", "Fuel Level", { min: 0, max: 100, unit: "%" }),
  ]),
  makeChecklist(7, "Product Line Changeover", "Operations", "normal", [
    field("text", "Line Lead"),
    field("checkbox", "Tooling Verified"),
    field("textarea", "Downtime Notes"),
  ]),
  makeChecklist(8, "Environmental Waste Log", "Compliance", "normal", [
    field("text", "Recorder Name"),
    field("numeric", "Waste (kg)", { min: 0, max: 1000, unit: "kg" }),
    field("radio", "Disposed Correctly?", { options: [{ label: "Yes", score: 10 }, { label: "No", score: 0 }] }),
  ]),
];

function submissionMeta(s) {
  const { answers: _answers, ...meta } = s;
  return meta;
}

/** Generate a single submission (full + meta) for a checklist. */
function makeSubmission(checklist, seq) {
  const operator = pick(OPERATORS);
  // Status weighted toward validated (approved) for a healthy-looking report.
  const status = weighted([
    ["validated", 6],
    ["submitted", 2],
    ["rejected", 1],
  ]);
  const submittedAt = Date.now() - rand(0, 29) * DAY - rand(0, 23) * 3600000;

  // Build answers with scores so totalScore is realistic.
  const answers = (checklist.full.fields || []).map((f) => {
    let score = 0;
    let value = "";
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

  const totalScore = answers.reduce((t, a) => t + (typeof a.score === "number" ? a.score : 0), 0);
  const id = `submission_seed_${checklist.id}_${seq}`;

  const submission = {
    id,
    checklistId: checklist.id,
    assignmentId: null,
    submittedBy: operator.userId,
    submittedByEmail: operator.email,
    submittedAt,
    status,
    answers,
    totalScore,
    location: checklist.full.location,
    attachments: [],
    signature: null,
    ...(status === "validated" || status === "rejected"
      ? { validatedBy: MANAGER_USER_ID, validatedAt: submittedAt + rand(1, 12) * 3600000 }
      : {}),
    ...(status === "rejected" ? { validationComments: "Please review flagged items and resubmit." } : {}),
  };

  return { id, submission };
}

async function upsert(key, value) {
  const { error } = await supabase.from(TABLE).upsert({ key, value });
  if (error) throw new Error(`upsert ${key} failed: ${error.message}`);
}

// Sample assignment: give the first checklist to the operator so it shows up
// under their "Pending Tasks". Shape matches createAssignment() in the server.
function makeAssignment(checklistId) {
  const now = Date.now();
  const assignment = {
    id: `assignment_seed_${now}`,
    checklistId,
    assignedTo: OPERATOR_USER_ID,
    assignedBy: MANAGER_USER_ID,
    assignedAt: now,
    status: "pending",
    dueDate: null,
    completedAt: null,
    submissionId: null,
  };
  const notification = {
    id: `notification_seed_${now}`,
    userId: OPERATOR_USER_ID,
    type: "assignment",
    checklistId,
    assignmentId: assignment.id,
    message: "You have been assigned a new checklist",
    createdAt: now,
    read: false,
  };
  return { assignment, notification };
}

async function main() {
  console.log(`Seeding ${checklists.length} checklists into tenant "${TENANT_ID}"...`);
  for (const c of checklists) {
    await upsert(tenantKey("checklist", c.id), c.full);
    await upsert(tenantKey("checklist_meta", c.id), c.meta);
    console.log(`  ✓ checklist: ${c.full.title}  (${c.category})`);
  }

  // Generate submissions across all checklists so the report has data.
  let subCount = 0;
  console.log("Seeding submissions...");
  for (const c of checklists) {
    const n = rand(8, 16); // submissions per checklist
    for (let s = 0; s < n; s++) {
      const { id, submission } = makeSubmission(c, s);
      await upsert(tenantKey("submission", id), submission);
      await upsert(tenantKey("submission_meta", id), submissionMeta(submission));
      subCount++;
    }
    console.log(`  ✓ ${n} submissions for "${c.full.title}"`);
  }

  // Assign the first checklist to the operator (pending task demo).
  const { assignment, notification } = makeAssignment(checklists[0].id);
  await upsert(tenantKey("assignment", assignment.id), assignment);
  await upsert(tenantKey("notification", notification.id), notification);
  console.log(`  ✓ assignment for "${checklists[0].full.title}" → operator`);

  console.log(
    `\nDone. Seeded ${checklists.length} checklists and ${subCount} submissions.\n` +
      "Open the app (npm run dev) and check the Reports page.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
