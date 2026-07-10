-- ─────────────────────────────────────────────────────────────────────────────
-- Seed sample checklists into the KV store (no Node/CLI needed).
-- Run AFTER 002_create_kv_store.sql, in:
--   Supabase Dashboard → SQL Editor → New Query → paste → Run
--   Project: gjobazdxqqmmqpksqdwk
--
-- The SQL Editor runs as a privileged role, so it bypasses RLS.
-- Keys match server/context.ts -> tenantKey(prefix, tenantId, id):
--   checklist:<tenant>:<id>        (full record, with fields)
--   checklist_meta:<tenant>:<id>   (lightweight record used for lists)
-- Tenant/manager IDs match the app's anonymous/demo mode.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Checklist 1: Daily Safety Inspection ─────────────────────────────────────
INSERT INTO public.kv_store_d5ac9b81 (key, value) VALUES
(
  'checklist:tenant_anonymous_shared:checklist_seed_1',
  '{
    "id": "checklist_seed_1",
    "title": "Daily Safety Inspection",
    "category": "Safety & Compliance",
    "priority": "High",
    "frequency": "ONE_TIME",
    "status": "published",
    "validationRequired": true,
    "assignedTo": "All",
    "location": "Building A",
    "createdBy": "00000000-0000-4000-8000-000000000001",
    "createdByEmail": "guest@local",
    "createdAt": 1752105600000,
    "updatedAt": 1752105600000,
    "version": 1,
    "fields": [
      { "uid": "f_name1", "typeId": "text", "label": "Inspector Name", "category": "input", "required": true },
      { "uid": "f_pass1", "typeId": "radio", "label": "Passed Inspection?", "category": "input", "required": true, "options": [ { "label": "Yes", "score": 10 }, { "label": "No", "score": 0 } ] },
      { "uid": "f_temp1", "typeId": "numeric", "label": "Temperature (C)", "category": "input", "required": false, "min": 18, "max": 24, "unit": "C" }
    ]
  }'::jsonb
),
(
  'checklist_meta:tenant_anonymous_shared:checklist_seed_1',
  '{
    "id": "checklist_seed_1",
    "title": "Daily Safety Inspection",
    "category": "Safety & Compliance",
    "priority": "High",
    "frequency": "ONE_TIME",
    "status": "published",
    "validationRequired": true,
    "assignedTo": "All",
    "location": "Building A",
    "createdBy": "00000000-0000-4000-8000-000000000001",
    "createdByEmail": "guest@local",
    "createdAt": 1752105600000,
    "updatedAt": 1752105600000,
    "version": 1
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ── Checklist 2: Equipment Maintenance Check ─────────────────────────────────
INSERT INTO public.kv_store_d5ac9b81 (key, value) VALUES
(
  'checklist:tenant_anonymous_shared:checklist_seed_2',
  '{
    "id": "checklist_seed_2",
    "title": "Equipment Maintenance Check",
    "category": "Maintenance",
    "priority": "Medium",
    "frequency": "ONE_TIME",
    "status": "published",
    "validationRequired": true,
    "assignedTo": "All",
    "location": "Building B",
    "createdBy": "00000000-0000-4000-8000-000000000001",
    "createdByEmail": "guest@local",
    "createdAt": 1752105600000,
    "updatedAt": 1752105600000,
    "version": 1,
    "fields": [
      { "uid": "f_tech2", "typeId": "text", "label": "Technician Name", "category": "input", "required": true },
      { "uid": "f_lube2", "typeId": "checkbox", "label": "Lubrication Done", "category": "input", "required": false },
      { "uid": "f_note2", "typeId": "textarea", "label": "Notes", "category": "input", "required": false }
    ]
  }'::jsonb
),
(
  'checklist_meta:tenant_anonymous_shared:checklist_seed_2',
  '{
    "id": "checklist_seed_2",
    "title": "Equipment Maintenance Check",
    "category": "Maintenance",
    "priority": "Medium",
    "frequency": "ONE_TIME",
    "status": "published",
    "validationRequired": true,
    "assignedTo": "All",
    "location": "Building B",
    "createdBy": "00000000-0000-4000-8000-000000000001",
    "createdByEmail": "guest@local",
    "createdAt": 1752105600000,
    "updatedAt": 1752105600000,
    "version": 1
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ── Sample assignment: give "Daily Safety Inspection" to the operator ────────
-- Shape matches createAssignment() in server/checklist.routes.ts.
-- assignedTo = operator user id (...002); assignedBy = manager (...001).
-- This makes the checklist show up under the operator's "Pending Tasks".
INSERT INTO public.kv_store_d5ac9b81 (key, value) VALUES
(
  'assignment:tenant_anonymous_shared:assignment_seed_1',
  '{
    "id": "assignment_seed_1",
    "checklistId": "checklist_seed_1",
    "assignedTo": "00000000-0000-4000-8000-000000000002",
    "assignedBy": "00000000-0000-4000-8000-000000000001",
    "assignedAt": 1752105600000,
    "status": "pending",
    "dueDate": null,
    "completedAt": null,
    "submissionId": null
  }'::jsonb
),
-- Matching notification (createNotification() shape) so the operator sees it.
(
  'notification:tenant_anonymous_shared:notification_seed_1',
  '{
    "id": "notification_seed_1",
    "userId": "00000000-0000-4000-8000-000000000002",
    "type": "assignment",
    "checklistId": "checklist_seed_1",
    "assignmentId": "assignment_seed_1",
    "message": "You have been assigned a new checklist",
    "createdAt": 1752105600000,
    "read": false
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Verify:
--   SELECT key FROM public.kv_store_d5ac9b81 WHERE key LIKE 'checklist_meta:%';
--   SELECT key FROM public.kv_store_d5ac9b81 WHERE key LIKE 'assignment:%';
