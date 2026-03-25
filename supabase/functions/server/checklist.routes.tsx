import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import { tenantKey } from "./context.tsx";
import { authMiddleware, requireOnboardedMiddleware, type Variables } from "./middleware.tsx";

const app = new Hono<{ Variables: Variables }>();
app.use("*", authMiddleware);
app.use("*", requireOnboardedMiddleware);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function calculateTotalScore(answers: any[]): number {
  if (!answers || !Array.isArray(answers)) return 0;
  return answers.reduce((total, answer) => {
    if (typeof answer.score === "number") return total + answer.score;
    return total;
  }, 0);
}

// kv.getByPrefix returns JSONB values directly (already-parsed objects).
// This helper normalises any lingering legacy string values gracefully.
function parseKvValue(val: any): any {
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return null; }
  }
  return val;
}

/**
 * Retry wrapper for kv.getByPrefix — the Supabase HTTP connection can
 * occasionally drop mid-response ("error reading a body from connection").
 * Retrying once after a short delay resolves the vast majority of cases.
 */
async function getByPrefixWithRetry(prefix: string, retries = 2, delayMs = 150): Promise<any[]> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await kv.getByPrefix(prefix);
    } catch (err) {
      lastErr = err;
      console.warn(`getByPrefix("${prefix}") attempt ${attempt + 1} failed: ${err}. Retrying in ${delayMs}ms…`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

async function createAssignment(
  tenantId: string,
  checklistId: string,
  assignedTo: string,
  assignedBy: string,
) {
  const assignmentId = `assignment_${Date.now()}_${crypto.randomUUID()}`;
  const assignment = {
    id: assignmentId,
    checklistId,
    assignedTo,
    assignedBy,
    assignedAt: Date.now(),
    status: "pending",
    dueDate: null,
    completedAt: null,
    submissionId: null,
  };
  await kv.set(tenantKey("assignment", tenantId, assignmentId), assignment);
  await createNotification(tenantId, {
    userId: assignedTo,
    type: "assignment",
    checklistId,
    assignmentId,
    message: "You have been assigned a new checklist",
  });
  console.log(`Assignment created: ${assignmentId} for ${assignedTo}`);
  return assignment;
}

async function createNotification(
  tenantId: string,
  params: {
    userId: string;
    type: string;
    checklistId?: string;
    assignmentId?: string;
    submissionId?: string;
    message: string;
    /** Full manager comment for checklist rejections (shown in notification UI + redo flow). */
    validationComments?: string;
  },
) {
  const notificationId = `notification_${Date.now()}_${crypto.randomUUID()}`;
  const notification = {
    id: notificationId,
    ...params,
    createdAt: Date.now(),
    read: false,
  };
  await kv.set(tenantKey("notification", tenantId, notificationId), notification);
  console.log(`Notification created: ${notificationId} for user ${params.userId}`);
  return notification;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECKLIST CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lightweight checklist record for listing — strips `fields` (which may
 * contain embedded base64 media dataUrls) to avoid query timeouts.
 */
function checklistMeta(ch: Record<string, any>) {
  const { fields: _fields, ...meta } = ch;
  return meta;
}

type Ctx = import("./context.tsx").RequestContext;

async function getChecklistForTenant(ctx: Ctx, checklistId: string): Promise<Record<string, any> | null> {
  return parseKvValue(await kv.get(tenantKey("checklist", ctx.tenantId, checklistId)));
}

async function userHasAssignmentToChecklist(ctx: Ctx, checklistId: string): Promise<boolean> {
  const raw = await kv.getByPrefix(`assignment:${ctx.tenantId}:`);
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map(parseKvValue)
    .some((a: any) => a && a.checklistId === checklistId && a.assignedTo === ctx.userId);
}

async function userHasSubmissionForChecklist(ctx: Ctx, checklistId: string): Promise<boolean> {
  const metaRaw = await getByPrefixWithRetry(`submission_meta:${ctx.tenantId}:`);
  return metaRaw
    .map(parseKvValue)
    .some((s: any) => s && s.checklistId === checklistId && s.submittedBy === ctx.userId);
}

/** Manager: full tenant access. User: assigned checklist, draft owner, or prior work on checklist. */
async function assertChecklistReadable(ctx: Ctx, checklistId: string): Promise<Record<string, any> | null> {
  const checklist = await getChecklistForTenant(ctx, checklistId);
  if (!checklist) return null;
  if (ctx.appRole === "manager") return checklist;
  if (checklist.createdBy === ctx.userId) return checklist;
  if (checklist.assignedTo === ctx.userId) return checklist;
  if (await userHasAssignmentToChecklist(ctx, checklistId)) return checklist;
  if (await userHasSubmissionForChecklist(ctx, checklistId)) return checklist;
  return null;
}

/** Operators only see rows tied to checklists they may access. */
async function filterByReadableChecklists(ctx: Ctx, rows: any[], checklistIdKey = "checklistId"): Promise<any[]> {
  if (ctx.appRole === "manager") return rows;
  const ids = [...new Set(rows.map((r) => r[checklistIdKey]).filter(Boolean))];
  const allowed = new Set<string>();
  for (const id of ids) {
    if (await assertChecklistReadable(ctx, id)) allowed.add(id);
  }
  return rows.filter((r) => r[checklistIdKey] && allowed.has(r[checklistIdKey]));
}

/** POST /checklists — create a new checklist draft */
app.post("/checklists", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    if (ctx.appRole !== "manager") {
      return c.json({ error: "Only managers can create checklists" }, 403);
    }
    const body = await c.req.json();
    const checklistId = body.id || `checklist_${Date.now()}_${crypto.randomUUID()}`;

    // ── Duplicate detection: same title (case-insensitive) + same frequency ──
    // Skip when the caller explicitly opts out (e.g. "Save anyway" from UI).
    const incomingTitle     = (body.title || "").trim().toLowerCase();
    const incomingFrequency = (body.frequency || "").trim().toUpperCase();

    if (incomingTitle && incomingFrequency && !body.bypassDuplicateCheck) {
      const allRaw    = await getByPrefixWithRetry(`checklist_meta:${ctx.tenantId}:`);
      const allLists  = allRaw.map(parseKvValue).filter((ch: any) => ch && ch.id && ch.id !== checklistId);
      const duplicate = allLists.find((ch: any) =>
        (ch.title || "").trim().toLowerCase() === incomingTitle &&
        (ch.frequency || "").trim().toUpperCase() === incomingFrequency
      );
      if (duplicate) {
        console.log(`Duplicate checklist detected on create: title="${body.title}" frequency="${body.frequency}"`);
        return c.json({
          error: "Conflict",
          conflict: true,
          conflictType: "duplicate",
          duplicate,
        }, 409);
      }
    }

    // Strip internal flag before persisting
    const { bypassDuplicateCheck: _bypass, ...safeBody } = body;
    const checklist = {
      ...safeBody,
      id: checklistId,
      createdBy: ctx.userId,
      createdByEmail: ctx.email,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      status: safeBody.status || "draft",
    };
    await kv.set(tenantKey("checklist", ctx.tenantId, checklistId), checklist);
    await kv.set(tenantKey("checklist_meta", ctx.tenantId, checklistId), checklistMeta(checklist));
    console.log(`Checklist created: ${checklistId}`);
    return c.json({ success: true, checklist });
  } catch (error) {
    console.error("Error creating checklist:", error);
    return c.json({ error: "Failed to create checklist", details: String(error) }, 500);
  }
});

/** GET /checklists — list all checklists (optionally filtered by status) */
app.get("/checklists", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const status = c.req.query("status");
    const createdBy = c.req.query("createdBy");
    if (createdBy && ctx.appRole !== "manager") {
      return c.json({ error: "Forbidden" }, 403);
    }

    // Use lightweight meta prefix only — never includes fields/base64 blobs.
    // A single query avoids the statement timeout caused by scanning full records.
    const metaRaw = await getByPrefixWithRetry(`checklist_meta:${ctx.tenantId}:`);

    let checklists = metaRaw
      .map(parseKvValue)
      .filter(Boolean)
      .filter((ch: any) => {
        if (!ch || !ch.id) return false;
        if (status && ch.status !== status) return false;
        if (createdBy && ch.createdBy !== createdBy) return false;
        return true;
      });

    if (ctx.appRole === "user") {
      const ids = new Set<string>();
      const rawAsn = await kv.getByPrefix(`assignment:${ctx.tenantId}:`);
      for (const a of Array.isArray(rawAsn) ? rawAsn : []) {
        const x = parseKvValue(a);
        if (x?.assignedTo === ctx.userId && x?.checklistId) ids.add(x.checklistId);
      }
      checklists = checklists.filter((ch: any) =>
        ch.createdBy === ctx.userId ||
        ch.assignedTo === ctx.userId ||
        ids.has(ch.id),
      );
    }
      // deduplicate by id (safety net)
      .filter((ch: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === ch.id) === i)
      .sort((a: any, b: any) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

    return c.json({ checklists, count: checklists.length });
  } catch (error) {
    console.error("Error listing checklists:", error);
    return c.json({ error: "Failed to list checklists", details: String(error) }, 500);
  }
});

/** GET /checklists/:id — get a specific checklist (full record with fields) */
app.get("/checklists/:id", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const checklistId = c.req.param("id");
    const checklist = await assertChecklistReadable(ctx, checklistId);
    if (!checklist) return c.json({ error: "Checklist not found" }, 404);
    return c.json({ checklist });
  } catch (error) {
    console.error("Error fetching checklist:", error);
    return c.json({ error: "Failed to fetch checklist", details: String(error) }, 500);
  }
});

/** PUT /checklists/:id — update a checklist (autosave) */
app.put("/checklists/:id", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    if (ctx.appRole !== "manager") {
      return c.json({ error: "Only managers can edit checklists" }, 403);
    }
    const checklistId = c.req.param("id");
    const body        = await c.req.json();
    const existing    = parseKvValue(await kv.get(tenantKey("checklist", ctx.tenantId, checklistId)));

    if (!existing) return c.json({ error: "Checklist not found" }, 404);

    // ── Duplicate detection: same title + same frequency on a DIFFERENT checklist ──
    const incomingTitle     = (body.title || existing.title || "").trim().toLowerCase();
    const incomingFrequency = (body.frequency || existing.frequency || "").trim().toUpperCase();

    if (incomingTitle && incomingFrequency && !body.bypassDuplicateCheck) {
      const allRaw    = await getByPrefixWithRetry(`checklist_meta:${ctx.tenantId}:`);
      const others    = allRaw.map(parseKvValue).filter((ch: any) => ch && ch.id && ch.id !== checklistId);
      const duplicate = others.find((ch: any) =>
        (ch.title || "").trim().toLowerCase() === incomingTitle &&
        (ch.frequency || "").trim().toUpperCase() === incomingFrequency
      );
      if (duplicate) {
        console.log(`Duplicate checklist detected on update ${checklistId}: title="${incomingTitle}" frequency="${incomingFrequency}"`);
        return c.json({
          error: "Conflict",
          conflict: true,
          conflictType: "duplicate",
          duplicate,
        }, 409);
      }
    }

    // Strip internal flag before persisting
    const { bypassDuplicateCheck: _bypass, ...safeBody } = body;
    const updated = {
      ...existing,
      ...safeBody,
      id: checklistId,
      version: existing.version + 1,
      updatedAt: Date.now(),
      updatedBy: ctx.userId,
    };
    await kv.set(tenantKey("checklist", ctx.tenantId, checklistId), updated);
    await kv.set(tenantKey("checklist_meta", ctx.tenantId, checklistId), checklistMeta(updated));
    console.log(`Checklist updated: ${checklistId} (v${updated.version})`);
    return c.json({ success: true, checklist: updated });
  } catch (error) {
    console.error("Error updating checklist:", error);
    return c.json({ error: "Failed to update checklist", details: String(error) }, 500);
  }
});

/** POST /checklists/:id/publish — publish a checklist */
app.post("/checklists/:id/publish", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    if (ctx.appRole !== "manager") {
      return c.json({ error: "Only managers can publish checklists" }, 403);
    }
    const checklistId = c.req.param("id");
    const checklist = parseKvValue(await kv.get(tenantKey("checklist", ctx.tenantId, checklistId)));
    if (!checklist) return c.json({ error: "Checklist not found" }, 404);

    const published = {
      ...checklist,
      status: "active",
      publishedAt: Date.now(),
      publishedBy: ctx.userId,
      managerUserId: checklist.managerUserId || ctx.userId,
      version: checklist.version + 1,
      updatedAt: Date.now(),
    };
    await kv.set(tenantKey("checklist", ctx.tenantId, checklistId), published);
    await kv.set(tenantKey("checklist_meta", ctx.tenantId, checklistId), checklistMeta(published));

    if (published.assignedTo) {
      await createAssignment(ctx.tenantId, checklistId, published.assignedTo, ctx.userId);
    }

    console.log(`Checklist published: ${checklistId}`);
    return c.json({ success: true, checklist: published });
  } catch (error) {
    console.error("Error publishing checklist:", error);
    return c.json({ error: "Failed to publish checklist", details: String(error) }, 500);
  }
});

/** DELETE /checklists/:id — delete a checklist */
app.delete("/checklists/:id", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    if (ctx.appRole !== "manager") {
      return c.json({ error: "Only managers can delete checklists" }, 403);
    }
    const checklistId = c.req.param("id");
    const existing = parseKvValue(await kv.get(tenantKey("checklist", ctx.tenantId, checklistId)));
    if (!existing) return c.json({ error: "Checklist not found" }, 404);
    await kv.del(tenantKey("checklist", ctx.tenantId, checklistId));
    await kv.del(tenantKey("checklist_meta", ctx.tenantId, checklistId));
    console.log(`Checklist deleted: ${checklistId}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting checklist:", error);
    return c.json({ error: "Failed to delete checklist", details: String(error) }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS
// ─────────────────────────────────────────────────────────────────────────────

/** POST /assignments — create a new assignment */
app.post("/assignments", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    if (ctx.appRole !== "manager") {
      return c.json({ error: "Only managers can create assignments" }, 403);
    }
    const { checklistId, assignedTo, dueDate } = await c.req.json();
    if (!checklistId || !assignedTo) {
      return c.json({ error: "Missing required fields: checklistId, assignedTo" }, 400);
    }
    const checklistExists = await kv.get(tenantKey("checklist", ctx.tenantId, checklistId));
    if (!checklistExists) return c.json({ error: "Checklist not found" }, 404);

    const assignment = await createAssignment(ctx.tenantId, checklistId, assignedTo, ctx.userId);
    if (dueDate) {
      (assignment as any).dueDate = dueDate;
      await kv.set(tenantKey("assignment", ctx.tenantId, assignment.id), assignment);
    }
    return c.json({ success: true, assignment });
  } catch (error) {
    console.error("Error creating assignment:", error);
    return c.json({ error: "Failed to create assignment", details: String(error) }, 500);
  }
});

/** GET /assignments — list assignments */
app.get("/assignments", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const status = c.req.query("status");
    const raw = await kv.getByPrefix(`assignment:${ctx.tenantId}:`);
    let assignments = (Array.isArray(raw) ? raw : [])
      .map(parseKvValue)
      .filter((a: any) => {
        if (!a || !a.id) return false;
        if (status && a.status !== status) return false;
        return true;
      })
      .sort((a: any, b: any) => b.assignedAt - a.assignedAt);

    if (ctx.appRole === "user") {
      assignments = assignments.filter((a: any) => a.assignedTo === ctx.userId);
    }

    // Enrich with lightweight checklist meta (never fetches fields/base64 blobs)
    const enriched = await Promise.all(
      assignments.map(async (assignment: any) => {
        try {
          const checklist = parseKvValue(
            await kv.get(tenantKey("checklist_meta", ctx.tenantId, assignment.checklistId)),
          );
          return { ...assignment, checklist: checklist ?? null };
        } catch {
          return { ...assignment, checklist: null };
        }
      }),
    );
    return c.json({ assignments: enriched, count: enriched.length });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return c.json({ error: "Failed to fetch assignments", details: String(error) }, 500);
  }
});

/** GET /assignments/:id — get a specific assignment */
app.get("/assignments/:id", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const assignmentId = c.req.param("id");
    const assignment = parseKvValue(await kv.get(tenantKey("assignment", ctx.tenantId, assignmentId)));
    if (!assignment) return c.json({ error: "Assignment not found" }, 404);
    if (ctx.appRole === "user" && assignment.assignedTo !== ctx.userId) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const checklist = parseKvValue(await kv.get(tenantKey("checklist", ctx.tenantId, assignment.checklistId)));
    return c.json({ assignment: { ...assignment, checklist } });
  } catch (error) {
    console.error("Error fetching assignment:", error);
    return c.json({ error: "Failed to fetch assignment", details: String(error) }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SUBMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a lightweight metadata record from a full submission.
 * Strips `answers` (which can contain giant base64 dataUrls) so that
 * kv.getByPrefix("submission_meta:") never times out.
 */
function submissionMeta(s: Record<string, any>) {
  const { answers: _answers, ...meta } = s;
  return meta;
}

/** POST /submissions — submit a completed checklist */
app.post("/submissions", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const { checklistId, assignmentId, answers, status } = await c.req.json();
    if (!checklistId || !answers) {
      return c.json({ error: "Missing required fields: checklistId, answers" }, 400);
    }
    const checklistReadable = await assertChecklistReadable(ctx, checklistId);
    if (!checklistReadable) {
      return c.json({ error: "Checklist not found" }, 404);
    }
    if (assignmentId) {
      const asn = parseKvValue(await kv.get(tenantKey("assignment", ctx.tenantId, assignmentId)));
      if (!asn || asn.checklistId !== checklistId) {
        return c.json({ error: "Assignment not found" }, 404);
      }
      if (asn.assignedTo !== ctx.userId) {
        return c.json({ error: "This assignment belongs to another user" }, 403);
      }
    } else if (ctx.appRole === "user") {
      const allowed =
        checklistReadable.assignedTo === ctx.userId ||
        (await userHasAssignmentToChecklist(ctx, checklistId));
      if (!allowed) {
        return c.json({ error: "You need an assignment to submit this checklist" }, 403);
      }
    }

    const submissionId = `submission_${Date.now()}_${crypto.randomUUID()}`;
    const submission = {
      id: submissionId,
      checklistId,
      assignmentId: assignmentId || null,
      submittedBy: ctx.userId,
      submittedByEmail: ctx.email,
      submittedAt: Date.now(),
      status: status || "submitted",
      answers,
      totalScore: calculateTotalScore(answers),
      location: null,
      attachments: [],
      signature: null,
    };
    // Store full record (with answers) and a lightweight meta record (without answers)
    await kv.set(tenantKey("submission", ctx.tenantId, submissionId), submission);
    await kv.set(tenantKey("submission_meta", ctx.tenantId, submissionId), submissionMeta(submission));

    // Mark the linked assignment as completed
    if (assignmentId) {
      const assignment = parseKvValue(await kv.get(tenantKey("assignment", ctx.tenantId, assignmentId)));
      if (assignment) {
        await kv.set(tenantKey("assignment", ctx.tenantId, assignmentId), {
          ...assignment,
          status: "completed",
          completedAt: Date.now(),
          submissionId,
        });
      }
    }

    // Notify manager if validation is required (managerName may be legacy display string)
    const checklist = checklistReadable;
    if (checklist?.validateChecklist) {
      const managerId =
        typeof checklist.managerUserId === "string" && checklist.managerUserId
          ? checklist.managerUserId
          : typeof checklist.managerName === "string" && checklist.managerName.startsWith("user_")
            ? checklist.managerName
            : null;
      if (managerId) {
        await createNotification(ctx.tenantId, {
          userId: managerId,
          type: "validation_required",
          checklistId,
          submissionId,
          message: "A checklist was submitted for validation",
        });
      }
    }

    console.log(`Submission created: ${submissionId}`);
    return c.json({ success: true, submission });
  } catch (error) {
    console.error("Error creating submission:", error);
    return c.json({ error: "Failed to create submission", details: String(error) }, 500);
  }
});

/** PUT /submissions/:id — update an existing draft submission */
app.put("/submissions/:id", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const submissionId = c.req.param("id");
    const body = await c.req.json();
    const submission = parseKvValue(await kv.get(tenantKey("submission", ctx.tenantId, submissionId)));
    if (!submission) return c.json({ error: "Submission not found" }, 404);
    if (submission.submittedBy !== ctx.userId && ctx.appRole !== "manager") {
      return c.json({ error: "Forbidden" }, 403);
    }

    // Only allow updating draft submissions (or re-validate)
    const updated = {
      ...submission,
      ...body,
      id: submissionId,
      updatedAt: Date.now(),
    };
    await kv.set(tenantKey("submission", ctx.tenantId, submissionId), updated);
    await kv.set(tenantKey("submission_meta", ctx.tenantId, submissionId), submissionMeta(updated));
    console.log(`Submission updated: ${submissionId} (status: ${updated.status})`);
    return c.json({ success: true, submission: updated });
  } catch (error) {
    console.error("Error updating submission:", error);
    return c.json({ error: "Failed to update submission", details: String(error) }, 500);
  }
});

/** PUT /submissions/:id/validate — manager validates a submission */
app.put("/submissions/:id/validate", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    if (ctx.appRole !== "manager") {
      return c.json({ error: "Only managers can validate submissions" }, 403);
    }
    const submissionId = c.req.param("id");
    const { status, comments } = await c.req.json();
    const submission = parseKvValue(await kv.get(tenantKey("submission", ctx.tenantId, submissionId)));
    if (!submission) return c.json({ error: "Submission not found" }, 404);

    const updated = {
      ...submission,
      status,
      validatedBy: ctx.userId,
      validatedAt: Date.now(),
      validationComments: comments,
    };
    await kv.set(tenantKey("submission", ctx.tenantId, submissionId), updated);
    await kv.set(tenantKey("submission_meta", ctx.tenantId, submissionId), submissionMeta(updated));

    const commentText = typeof comments === "string" ? comments.trim() : "";
    const message =
      status === "rejected" && commentText
        ? `Your checklist was returned for changes. Feedback: ${commentText.length > 180 ? `${commentText.slice(0, 177)}…` : commentText}`
        : status === "rejected"
          ? "Your checklist was returned for changes. Please review the feedback and resubmit."
          : "Your checklist has been validated.";

    await createNotification(ctx.tenantId, {
      userId: submission.submittedBy,
      type: status === "validated" ? "submission_validated" : "submission_rejected",
      checklistId: submission.checklistId,
      assignmentId: submission.assignmentId || undefined,
      submissionId,
      message,
      ...(status === "rejected" && commentText ? { validationComments: commentText } : {}),
    });

    // Re-open the linked assignment so the operator can redo and resubmit.
    if (status === "rejected" && submission.assignmentId) {
      const assignment = parseKvValue(await kv.get(tenantKey("assignment", ctx.tenantId, submission.assignmentId)));
      if (assignment) {
        await kv.set(tenantKey("assignment", ctx.tenantId, submission.assignmentId), {
          ...assignment,
          status: "pending",
          completedAt: null,
        });
      }
    }

    console.log(`Submission ${status}: ${submissionId}`);
    return c.json({ success: true, submission: updated });
  } catch (error) {
    console.error("Error validating submission:", error);
    return c.json({ error: "Failed to validate submission", details: String(error) }, 500);
  }
});

/** GET /submissions — list submissions (uses meta keys to avoid blob timeouts) */
app.get("/submissions", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const checklistId = c.req.query("checklistId");
    const status = c.req.query("status");
    const assignmentId = c.req.query("assignmentId");

    // Use the lightweight meta prefix only — never includes answers/base64 blobs.
    // A single query avoids the statement timeout caused by scanning full records.
    const metaRaw = await getByPrefixWithRetry(`submission_meta:${ctx.tenantId}:`);

    let submissions = metaRaw
      .map(parseKvValue)
      .filter(Boolean)
      .filter((s: any) => {
        if (!s || !s.id) return false;
        if (checklistId && s.checklistId !== checklistId) return false;
        if (status && s.status !== status) return false;
        if (assignmentId && s.assignmentId !== assignmentId) return false;
        return true;
      })
      .filter((s: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === s.id) === i)
      .sort((a: any, b: any) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0));

    if (ctx.appRole === "user") {
      submissions = submissions.filter((s: any) => s.submittedBy === ctx.userId);
    }

    return c.json({ submissions, count: submissions.length });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return c.json({ error: "Failed to fetch submissions", details: String(error) }, 500);
  }
});

/** GET /submissions/:id — get a specific submission */
app.get("/submissions/:id", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const submissionId = c.req.param("id");
    const submission = parseKvValue(await kv.get(tenantKey("submission", ctx.tenantId, submissionId)));
    if (!submission) return c.json({ error: "Submission not found" }, 404);
    if (ctx.appRole === "user" && submission.submittedBy !== ctx.userId) {
      return c.json({ error: "Forbidden" }, 403);
    }
    return c.json({ submission });
  } catch (error) {
    console.error("Error fetching submission:", error);
    return c.json({ error: "Failed to fetch submission", details: String(error) }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /notifications — list notifications (optional ?userId= to scope recipient) */
app.get("/notifications", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const unreadOnly = c.req.query("unread") === "true";
    const userIdFilter =
      ctx.appRole === "manager" ? c.req.query("userId") : ctx.userId;
    const raw = await kv.getByPrefix(`notification:${ctx.tenantId}:`);
    const safeRaw = Array.isArray(raw) ? raw : [];
    let notifications = safeRaw
      .map(parseKvValue)
      .filter((n: any) => {
        // Skip index keys (string values) — keep only notification objects
        if (!n || typeof n !== "object" || !n.userId) return false;
        if (userIdFilter && n.userId !== userIdFilter) return false;
        if (unreadOnly && n.read) return false;
        return true;
      })
      .sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

    if (ctx.appRole === "manager" && !c.req.query("userId")) {
      notifications = notifications.filter((n: any) => n.userId === ctx.userId);
    }

    return c.json({ notifications, count: notifications.length });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return c.json({ notifications: [], count: 0 });
  }
});

/** PUT /notifications/:id/read — mark notification as read */
app.put("/notifications/:id/read", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const notificationId = c.req.param("id");
    const notification = parseKvValue(await kv.get(tenantKey("notification", ctx.tenantId, notificationId)));
    if (!notification) return c.json({ error: "Notification not found" }, 404);
    if (notification.userId !== ctx.userId) return c.json({ error: "Forbidden" }, 403);
    const updated = { ...notification, read: true, readAt: Date.now() };
    await kv.set(tenantKey("notification", ctx.tenantId, notificationId), updated);
    return c.json({ success: true, notification: updated });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return c.json({ error: "Failed to mark notification as read", details: String(error) }, 500);
  }
});

/** DELETE /notifications/:id — delete a notification */
app.delete("/notifications/:id", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const notificationId = c.req.param("id");
    const notification = parseKvValue(await kv.get(tenantKey("notification", ctx.tenantId, notificationId)));
    if (!notification) return c.json({ error: "Notification not found" }, 404);
    if (notification.userId !== ctx.userId) return c.json({ error: "Forbidden" }, 403);
    await kv.del(tenantKey("notification", ctx.tenantId, notificationId));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return c.json({ error: "Failed to delete notification", details: String(error) }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TAGS
// ─────────────────────────────────────────────────────────────────────────────

/** Lightweight tag meta — strips attachments (base64 blobs) for listing */
function tagMeta(tag: Record<string, any>) {
  const { attachments: _a, ...meta } = tag;
  return meta;
}

/** POST /tags — declare a new tag during checklist execution */
app.post("/tags", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const body = await c.req.json();
    const { checklistId, tagType, location, anomaly, resolutionResponsibility,
            reviewer, criticality, observation, attachments } = body;

    if (!checklistId || !tagType || !anomaly || !criticality || !observation) {
      return c.json({ error: "Missing required fields: checklistId, tagType, anomaly, criticality, observation" }, 400);
    }
    if (!(await assertChecklistReadable(ctx, checklistId))) {
      return c.json({ error: "Checklist not found" }, 404);
    }

    const tagId = `tag_${Date.now()}_${crypto.randomUUID()}`;
    const tag = {
      id: tagId,
      checklistId,
      tagType,
      location: location || "",
      anomaly,
      resolutionResponsibility: resolutionResponsibility || "",
      reviewer: reviewer || "",
      criticality,
      observation,
      attachments: attachments || [],
      createdBy: ctx.userId,
      createdAt: Date.now(),
      status: "open",
    };

    await kv.set(tenantKey("tag", ctx.tenantId, tagId), tag);
    await kv.set(tenantKey("tag_meta", ctx.tenantId, tagId), tagMeta(tag));
    console.log(`Tag declared: ${tagId} (${tagType} / ${criticality}) on checklist ${checklistId}`);
    return c.json({ success: true, tag });
  } catch (error) {
    console.error("Error creating tag:", error);
    return c.json({ error: "Failed to create tag", details: String(error) }, 500);
  }
});

/** GET /tags — list tags, optionally filtered by checklistId or status */
app.get("/tags", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const checklistId = c.req.query("checklistId");
    const status      = c.req.query("status");
    const tagType     = c.req.query("tagType");

    const metaRaw = await getByPrefixWithRetry(`tag_meta:${ctx.tenantId}:`);
    let tags = metaRaw
      .map(parseKvValue)
      .filter(Boolean)
      .filter((t: any) => {
        if (!t || !t.id) return false;
        if (checklistId && t.checklistId !== checklistId) return false;
        if (status    && t.status    !== status)    return false;
        if (tagType   && t.tagType   !== tagType)   return false;
        return true;
      })
      .filter((t: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === t.id) === i)
      .sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

    if (checklistId && ctx.appRole === "user") {
      if (!(await assertChecklistReadable(ctx, checklistId))) {
        return c.json({ error: "Checklist not found" }, 404);
      }
    }
    tags = await filterByReadableChecklists(ctx, tags);

    return c.json({ tags, count: tags.length });
  } catch (error) {
    console.error("Error listing tags:", error);
    return c.json({ error: "Failed to list tags", details: String(error) }, 500);
  }
});

/** GET /tags/:id — get a specific tag (full record with attachments) */
app.get("/tags/:id", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const tagId = c.req.param("id");
    const tag = parseKvValue(await kv.get(tenantKey("tag", ctx.tenantId, tagId)));
    if (!tag) return c.json({ error: "Tag not found" }, 404);
    if (!(await assertChecklistReadable(ctx, tag.checklistId))) {
      return c.json({ error: "Tag not found" }, 404);
    }
    return c.json({ tag });
  } catch (error) {
    console.error("Error fetching tag:", error);
    return c.json({ error: "Failed to fetch tag", details: String(error) }, 500);
  }
});

/** PUT /tags/:id/status — update tag status (open → in_progress → resolved) */
app.put("/tags/:id/status", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const tagId = c.req.param("id");
    const { status } = await c.req.json();
    const tag = parseKvValue(await kv.get(tenantKey("tag", ctx.tenantId, tagId)));
    if (!tag) return c.json({ error: "Tag not found" }, 404);
    if (!(await assertChecklistReadable(ctx, tag.checklistId))) {
      return c.json({ error: "Tag not found" }, 404);
    }
    const updated = { ...tag, status, updatedAt: Date.now(), updatedBy: ctx.userId };
    await kv.set(tenantKey("tag", ctx.tenantId, tagId), updated);
    await kv.set(tenantKey("tag_meta", ctx.tenantId, tagId), tagMeta(updated));
    console.log(`Tag ${tagId} status updated to ${status}`);
    return c.json({ success: true, tag: updated });
  } catch (error) {
    console.error("Error updating tag status:", error);
    return c.json({ error: "Failed to update tag status", details: String(error) }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IMMEDIATE ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

function immediateActionMeta(action: Record<string, any>) {
  return {
    id: action.id,
    checklistId: action.checklistId,
    actionDescription: action.actionDescription,
    actionOwner: action.actionOwner,
    category: action.category,
    subcategory: action.subcategory,
    status: action.status,
    createdAt: action.createdAt,
    createdBy: action.createdBy,
  };
}

/** POST /immediate-actions — create a new immediate action */
app.post("/immediate-actions", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const body = await c.req.json();
    const { checklistId, actionDescription, actionOwner, category, subcategory } = body;

    if (!checklistId || !actionDescription || !actionOwner || !category) {
      return c.json({ error: "Missing required fields: checklistId, actionDescription, actionOwner, category" }, 400);
    }
    if (!(await assertChecklistReadable(ctx, checklistId))) {
      return c.json({ error: "Checklist not found" }, 404);
    }

    const actionId = `ia_${Date.now()}_${crypto.randomUUID()}`;
    const action = {
      id: actionId,
      checklistId,
      actionDescription,
      actionOwner,
      category,
      subcategory: subcategory || null,
      status: "open",
      createdBy: ctx.userId,
      createdAt: Date.now(),
    };

    await kv.set(tenantKey("immediate_action", ctx.tenantId, actionId), action);
    await kv.set(tenantKey("immediate_action_meta", ctx.tenantId, actionId), immediateActionMeta(action));
    console.log(`Immediate action created: ${actionId} (${category}) on checklist ${checklistId}`);
    return c.json({ success: true, action });
  } catch (error) {
    console.error("Error creating immediate action:", error);
    return c.json({ error: "Failed to create immediate action", details: String(error) }, 500);
  }
});

/** GET /immediate-actions — list immediate actions, optionally filtered by checklistId */
app.get("/immediate-actions", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const checklistId = c.req.query("checklistId");
    const status      = c.req.query("status");

    const metaRaw = await getByPrefixWithRetry(`immediate_action_meta:${ctx.tenantId}:`);
    let actions = metaRaw
      .map(parseKvValue)
      .filter(Boolean)
      .filter((a: any) => {
        if (!a || !a.id) return false;
        if (checklistId && a.checklistId !== checklistId) return false;
        if (status && a.status !== status) return false;
        return true;
      })
      .filter((a: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === a.id) === i)
      .sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

    if (checklistId && ctx.appRole === "user") {
      if (!(await assertChecklistReadable(ctx, checklistId))) {
        return c.json({ error: "Checklist not found" }, 404);
      }
    }
    actions = await filterByReadableChecklists(ctx, actions);

    return c.json({ actions, count: actions.length });
  } catch (error) {
    console.error("Error listing immediate actions:", error);
    return c.json({ error: "Failed to list immediate actions", details: String(error) }, 500);
  }
});

/** GET /immediate-actions/:id — get a specific immediate action */
app.get("/immediate-actions/:id", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const actionId = c.req.param("id");
    const action = parseKvValue(await kv.get(tenantKey("immediate_action", ctx.tenantId, actionId)));
    if (!action) return c.json({ error: "Immediate action not found" }, 404);
    if (!(await assertChecklistReadable(ctx, action.checklistId))) {
      return c.json({ error: "Immediate action not found" }, 404);
    }
    return c.json({ action });
  } catch (error) {
    console.error("Error fetching immediate action:", error);
    return c.json({ error: "Failed to fetch immediate action", details: String(error) }, 500);
  }
});

/** PUT /immediate-actions/:id/status — update immediate action status */
app.put("/immediate-actions/:id/status", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const actionId = c.req.param("id");
    const { status } = await c.req.json();
    const action = parseKvValue(await kv.get(tenantKey("immediate_action", ctx.tenantId, actionId)));
    if (!action) return c.json({ error: "Immediate action not found" }, 404);
    if (!(await assertChecklistReadable(ctx, action.checklistId))) {
      return c.json({ error: "Immediate action not found" }, 404);
    }
    const updated = { ...action, status, updatedAt: Date.now(), updatedBy: ctx.userId };
    await kv.set(tenantKey("immediate_action", ctx.tenantId, actionId), updated);
    await kv.set(tenantKey("immediate_action_meta", ctx.tenantId, actionId), immediateActionMeta(updated));
    console.log(`Immediate action ${actionId} status updated to ${status}`);
    return c.json({ success: true, action: updated });
  } catch (error) {
    console.error("Error updating immediate action status:", error);
    return c.json({ error: "Failed to update immediate action status", details: String(error) }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CLOSURE EVENTS
// ─────────────────────────────────────────────────────────────────────────────

/** POST /closure-events — create a closure event attached to a submission */
app.post("/closure-events", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const body = await c.req.json();
    const { checklistId, submissionId, title, description, closureDate } = body;
    if (!checklistId || !title) {
      return c.json({ error: "Missing required fields: checklistId, title" }, 400);
    }
    if (!(await assertChecklistReadable(ctx, checklistId))) {
      return c.json({ error: "Checklist not found" }, 404);
    }
    const id = `closure_event_${Date.now()}_${crypto.randomUUID()}`;
    const record = {
      id,
      checklistId,
      submissionId: submissionId || null,
      title,
      description: description || "",
      closureDate: closureDate || null,
      status: "open",
      createdBy: ctx.userId,
      createdAt: Date.now(),
    };
    await kv.set(tenantKey("closure_event", ctx.tenantId, id), record);
    await kv.set(tenantKey("closure_event_meta", ctx.tenantId, id), { id, checklistId, title, status: record.status, createdAt: record.createdAt });
    console.log(`Closure event created: ${id} on checklist ${checklistId}`);
    return c.json({ success: true, closureEvent: record });
  } catch (error) {
    console.error("Error creating closure event:", error);
    return c.json({ error: "Failed to create closure event", details: String(error) }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTION ITEMS
// ─────────────────────────────────────────────────────────────────────────────

/** POST /action-items — create a follow-up action item */
app.post("/action-items", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const body = await c.req.json();
    const { checklistId, submissionId, title, assignee, dueDate, priority } = body;
    if (!checklistId || !title) {
      return c.json({ error: "Missing required fields: checklistId, title" }, 400);
    }
    if (!(await assertChecklistReadable(ctx, checklistId))) {
      return c.json({ error: "Checklist not found" }, 404);
    }
    const id = `action_item_${Date.now()}_${crypto.randomUUID()}`;
    const record = {
      id,
      checklistId,
      submissionId: submissionId || null,
      title,
      assignee: assignee || "",
      dueDate: dueDate || null,
      priority: priority || "normal",
      status: "open",
      createdBy: ctx.userId,
      createdAt: Date.now(),
    };
    await kv.set(tenantKey("action_item", ctx.tenantId, id), record);
    await kv.set(tenantKey("action_item_meta", ctx.tenantId, id), { id, checklistId, title, priority: record.priority, status: record.status, createdAt: record.createdAt });
    console.log(`Action item created: ${id} on checklist ${checklistId}`);
    return c.json({ success: true, actionItem: record });
  } catch (error) {
    console.error("Error creating action item:", error);
    return c.json({ error: "Failed to create action item", details: String(error) }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// RISK ASSESSMENTS
// ─────────────────────────────────────────────────────────────────────────────

function computeRiskLevel(likelihood: string, impact: string): string {
  const l = ({ low: 1, medium: 2, high: 3 } as Record<string, number>)[likelihood] ?? 2;
  const i = ({ low: 1, medium: 2, high: 3 } as Record<string, number>)[impact] ?? 2;
  const score = l * i;
  if (score >= 6) return "high";
  if (score >= 3) return "medium";
  return "low";
}

/** POST /risk-assessments — create a risk assessment record */
app.post("/risk-assessments", async (c) => {
  try {
    const ctx = c.get("reqCtx")!;
    const body = await c.req.json();
    const { checklistId, submissionId, description, likelihood, impact } = body;
    if (!checklistId || !description) {
      return c.json({ error: "Missing required fields: checklistId, description" }, 400);
    }
    if (!(await assertChecklistReadable(ctx, checklistId))) {
      return c.json({ error: "Checklist not found" }, 404);
    }
    const id = `risk_assessment_${Date.now()}_${crypto.randomUUID()}`;
    const riskLevel = computeRiskLevel(likelihood ?? "medium", impact ?? "medium");
    const record = {
      id,
      checklistId,
      submissionId: submissionId || null,
      description,
      likelihood: likelihood || "medium",
      impact: impact || "medium",
      riskLevel,
      status: "open",
      createdBy: ctx.userId,
      createdAt: Date.now(),
    };
    await kv.set(tenantKey("risk_assessment", ctx.tenantId, id), record);
    await kv.set(tenantKey("risk_assessment_meta", ctx.tenantId, id), { id, checklistId, description, riskLevel, status: record.status, createdAt: record.createdAt });
    console.log(`Risk assessment created: ${id} (${riskLevel}) on checklist ${checklistId}`);
    return c.json({ success: true, riskAssessment: record });
  } catch (error) {
    console.error("Error creating risk assessment:", error);
    return c.json({ error: "Failed to create risk assessment", details: String(error) }, 500);
  }
});

export default app;