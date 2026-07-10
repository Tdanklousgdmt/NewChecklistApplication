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
const genId = (i) => `checklist_seed_${Date.now()}_${i}`;

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
function makeChecklist(i, title, category, priority, fields) {
  const id = genId(i);
  const now = Date.now();
  const full = {
    id,
    title,
    category,
    priority,
    frequency: "ONE_TIME",
    status: "published",
    validationRequired: true,
    assignedTo: "All",
    location: "Building A",
    createdBy: MANAGER_USER_ID,
    createdByEmail: "guest@local",
    createdAt: now,
    updatedAt: now,
    version: 1,
    fields,
  };
  // meta = everything except `fields`
  const { fields: _omit, ...meta } = full;
  return { id, full, meta };
}

const checklists = [
  makeChecklist(1, "Daily Safety Inspection", "Safety & Compliance", "High", [
    field("text", "Inspector Name"),
    field("radio", "Passed Inspection?", {
      options: [
        { label: "Yes", score: 10 },
        { label: "No", score: 0 },
      ],
    }),
    field("numeric", "Temperature (°C)", { min: 18, max: 24, unit: "°C" }),
  ]),
  makeChecklist(2, "Equipment Maintenance Check", "Maintenance", "Medium", [
    field("text", "Technician Name"),
    field("checkbox", "Lubrication Done"),
    field("textarea", "Notes"),
  ]),
];

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
    console.log(`  ✓ ${c.full.title}  (${c.id})`);
  }

  // Assign the first checklist to the operator.
  const { assignment, notification } = makeAssignment(checklists[0].id);
  await upsert(tenantKey("assignment", assignment.id), assignment);
  await upsert(tenantKey("notification", notification.id), notification);
  console.log(`  ✓ assignment for "${checklists[0].full.title}" → operator`);

  console.log("Done. Open the app (npm run dev) — the checklists should appear in the library/dashboard.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
