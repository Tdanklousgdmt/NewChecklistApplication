import { ChecklistVersion } from '../hooks/useAutosave';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { getAccessToken } from '../lib/authToken';

/**
 * API base (no trailing slash).
 * - Default: Supabase Edge function URL (already includes `make-server-d5ac9b81`).
 * - Vercel: set `VITE_API_BASE_URL=/api` (or `https://your-app.vercel.app/api`). We append
 *   `/make-server-d5ac9b81` so paths match the Hono app (`/auth/onboarding`, `/checklists`, …).
 */
function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return `https://${projectId}.supabase.co/functions/v1/make-server-d5ac9b81`;
  }
  let base = String(raw).trim().replace(/\/$/, "");
  // Same-origin or absolute URL ending with /api → mount path for serverless handler
  if (base === "/api" || /\/api$/i.test(base)) {
    base = `${base}/make-server-d5ac9b81`;
  }
  return base;
}

export const SERVER_URL = resolveApiBase();

export function buildAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const userJwt = getAccessToken();
  if (!userJwt) throw new Error('Not signed in');
  return {
    'Content-Type': 'application/json',
    apikey: publicAnonKey,
    Authorization: `Bearer ${userJwt}`,
    ...extra,
  };
}

// ── Core API caller ────────────────────────────────────────────────────────────
// Edge gateway: anon key + authenticated user JWT (role authenticated).
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    ...buildAuthHeaders(),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  console.log(`[API] ${method} ${endpoint}`);

  const response = await fetch(`${SERVER_URL}${endpoint}`, {
    ...options,
    method,
    headers,
  });

  // Always parse the body so callers can inspect it (e.g. for 409 conflict data)
  let body: any = null;
  try { body = await response.json(); } catch { /* no body */ }

  if (!response.ok) {
    const errMsg = body?.error || body?.message || `HTTP ${response.status}`;
    console.error(`[API] ❌ Error ${method} ${endpoint}:`, body);
    // Attach the full body so catch blocks can read `duplicate` etc.
    const err: any = new Error(errMsg);
    err.status  = response.status;
    err.body    = body;
    throw err;
  }

  console.log(`[API] ✓ Success ${method} ${endpoint}`);
  return body;
}

/** @deprecated use Supabase session + getAccessToken */
export function setAuthToken(_token: string) {}
/** @deprecated use signOut from AuthContext */
export function clearAuthToken() {}
/** @deprecated */
export function getAuthStatus() {
  return { hasToken: !!getAccessToken(), token: getAccessToken() };
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ChecklistData {
  title: string;
  category: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  validFrom: string;
  validTo: string;
  /** Step 1 emits ONE_OFF | PERMANENT | RECURRING; legacy ONE_TIME also accepted */
  frequency: 'ONE_OFF' | 'ONE_TIME' | 'PERMANENT' | 'RECURRING';
  assignedTo: string;
  location: string;
  validateChecklist: boolean;
  managerName?: string;
  /** Supabase auth user id of the validating manager (for notifications). */
  managerUserId?: string;
  canvasFields: any[];
  notes?: string;
}

// Thrown when the server detects a duplicate (same title + frequency)
export class DuplicateChecklistError extends Error {
  duplicate: any;
  constructor(duplicate: any) {
    super('Conflict');
    this.name = 'DuplicateChecklistError';
    this.duplicate = duplicate;
  }
}

// ── Service ───────────────────────────────────────────────────────────────────
export const checklistService = {
  generateName(data: Partial<ChecklistData>): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const category = data.category || 'Untitled';
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${category} - Draft ${timestamp} - ${random}`;
  },

  async createDraft(data: Partial<ChecklistData>, bypassDuplicate = false): Promise<ChecklistVersion> {
    const checklistData = {
      ...data,
      title: data.title || this.generateName(data),
      status: 'draft',
      ...(bypassDuplicate ? { bypassDuplicateCheck: true } : {}),
    };

    let response: any;
    try {
      response = await apiFetch('/checklists', {
        method: 'POST',
        body: JSON.stringify(checklistData),
      });
    } catch (error: any) {
      if (error.status === 409 && error.body?.conflictType === 'duplicate') {
        throw new DuplicateChecklistError(error.body?.duplicate ?? null);
      }
      throw error;
    }

    if (!response.success) throw new Error(response.error || 'Failed to create checklist');
    const checklist = response.checklist;
    return { id: checklist.id, version: checklist.version, updatedAt: checklist.updatedAt, data: checklist };
  },

  async saveChecklist(id: string, data: ChecklistData, bypassDuplicate = false): Promise<ChecklistVersion> {
    let response: any;
    try {
      response = await apiFetch(`/checklists/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...data, ...(bypassDuplicate ? { bypassDuplicateCheck: true } : {}) }),
      });
    } catch (error: any) {
      if (error.status === 409 && error.body?.conflictType === 'duplicate') {
        throw new DuplicateChecklistError(error.body?.duplicate ?? null);
      }
      throw error;
    }
    if (!response.success) throw new Error(response.error || 'Failed to save checklist');
    const checklist = response.checklist;
    return { id: checklist.id, version: checklist.version, updatedAt: checklist.updatedAt, data: checklist };
  },

  async getChecklist(id: string): Promise<ChecklistVersion | null> {
    try {
      const response = await apiFetch(`/checklists/${id}`, { method: 'GET' });
      const checklist = response.checklist;
      return { id: checklist.id, version: checklist.version, updatedAt: checklist.updatedAt, data: checklist };
    } catch (error) {
      console.error('Error fetching checklist:', error);
      return null;
    }
  },

  async deleteChecklist(id: string): Promise<void> {
    await apiFetch(`/checklists/${id}`, { method: 'DELETE' });
  },

  async listChecklists(status?: 'draft' | 'active' | 'archived'): Promise<ChecklistVersion[]> {
    const query = status ? `?status=${status}` : '';
    const response = await apiFetch(`/checklists${query}`, { method: 'GET' });
    return response.checklists.map((checklist: any) => ({
      id: checklist.id,
      version: checklist.version,
      updatedAt: checklist.updatedAt,
      data: checklist,
    }));
  },

  async publishChecklist(id: string): Promise<ChecklistVersion> {
    const response = await apiFetch(`/checklists/${id}/publish`, { method: 'POST' });
    if (!response.success) throw new Error(response.error || 'Failed to publish checklist');
    const checklist = response.checklist;
    return { id: checklist.id, version: checklist.version, updatedAt: checklist.updatedAt, data: checklist };
  },

  async getAssignments(status?: 'pending' | 'completed' | 'overdue'): Promise<any[]> {
    const query = status ? `?status=${status}` : '';
    const response = await apiFetch(`/assignments${query}`, { method: 'GET' });
    return response.assignments;
  },

  async getAssignment(assignmentId: string): Promise<any | null> {
    try {
      const response = await apiFetch(`/assignments/${assignmentId}`, { method: 'GET' });
      return response.assignment ?? null;
    } catch (error) {
      console.error('Error fetching assignment:', error);
      return null;
    }
  },

  async submitExecution(checklistId: string, assignmentId: string | null, answers: any[]): Promise<any> {
    const response = await apiFetch('/submissions', {
      method: 'POST',
      body: JSON.stringify({ checklistId, assignmentId, answers, status: 'submitted' }),
    });
    if (!response.success) throw new Error(response.error || 'Failed to submit checklist');
    return response.submission;
  },

  async getSubmissions(checklistId?: string, status?: string, assignmentId?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (checklistId) params.set('checklistId', checklistId);
    if (status) params.set('status', status);
    if (assignmentId) params.set('assignmentId', assignmentId);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiFetch(`/submissions${query}`, { method: 'GET' });
    return response.submissions;
  },

  async getSubmission(submissionId: string): Promise<any | null> {
    try {
      const response = await apiFetch(`/submissions/${submissionId}`, { method: 'GET' });
      return response.submission ?? null;
    } catch (error) {
      console.error('Error fetching submission:', error);
      return null;
    }
  },

  async validateSubmission(submissionId: string, status: 'validated' | 'rejected', comments?: string): Promise<any> {
    const response = await apiFetch(`/submissions/${submissionId}/validate`, {
      method: 'PUT',
      body: JSON.stringify({ status, comments }),
    });
    if (!response.success) throw new Error(response.error || 'Failed to validate submission');
    return response.submission;
  },

  // ── Draft Submissions ──────────────────────────────────────────────────────

  /** Find an existing draft submission for a checklist (+optional assignment). */
  async getDraftSubmission(checklistId: string, assignmentId?: string | null): Promise<any | null> {
    try {
      const params = new URLSearchParams({ checklistId, status: 'draft' });
      if (assignmentId) params.set('assignmentId', assignmentId);
      const response = await apiFetch(`/submissions?${params.toString()}`, { method: 'GET' });
      // Return the most-recently-updated draft
      const drafts: any[] = response.submissions || [];
      if (drafts.length === 0) return null;
      return drafts.sort((a, b) => (b.updatedAt || b.submittedAt) - (a.updatedAt || a.submittedAt))[0];
    } catch (err) {
      console.error('Error fetching draft submission:', err);
      return null;
    }
  },

  /** Create a new draft submission. */
  async createDraftSubmission(checklistId: string, assignmentId: string | null, answers: any[]): Promise<any> {
    const response = await apiFetch('/submissions', {
      method: 'POST',
      body: JSON.stringify({ checklistId, assignmentId, answers, status: 'draft' }),
    });
    if (!response.success) throw new Error(response.error || 'Failed to save draft');
    return response.submission;
  },

  /** Update (overwrite answers in) an existing draft submission. */
  async updateDraftSubmission(submissionId: string, answers: any[]): Promise<any> {
    const response = await apiFetch(`/submissions/${submissionId}`, {
      method: 'PUT',
      body: JSON.stringify({ answers, status: 'draft', updatedAt: Date.now() }),
    });
    if (!response.success) throw new Error(response.error || 'Failed to update draft');
    return response.submission;
  },

  /** Promote a draft to a real submission. */
  async finaliseDraftSubmission(submissionId: string, answers: any[]): Promise<any> {
    const response = await apiFetch(`/submissions/${submissionId}`, {
      method: 'PUT',
      body: JSON.stringify({ answers, status: 'submitted', submittedAt: Date.now() }),
    });
    if (!response.success) throw new Error(response.error || 'Failed to submit');
    return response.submission;
  },

  /** Delete a draft submission (e.g. when user discards). */
  async deleteDraftSubmission(submissionId: string): Promise<void> {
    // Re-use the submission endpoint — mark as deleted or remove
    await apiFetch(`/submissions/${submissionId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'discarded' }),
    });
  },

  /** List all draft submissions. */
  async listDraftSubmissions(): Promise<any[]> {
    const response = await apiFetch('/submissions?status=draft', { method: 'GET' });
    return response.submissions || [];
  },

  /**
   * @param userId When set (e.g. `"guest"` for operators), only that recipient's notifications are returned.
   */
  async getNotifications(unreadOnly = false, userId?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (unreadOnly) params.set('unread', 'true');
      if (userId) params.set('userId', userId);
      const q = params.toString();
      const response = await apiFetch(`/notifications${q ? `?${q}` : ''}`, { method: 'GET' });
      return response.notifications ?? [];
    } catch (err) {
      console.warn('[checklistService] getNotifications failed, returning []:', err);
      return [];
    }
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    await apiFetch(`/notifications/${notificationId}/read`, { method: 'PUT' });
  },

  async updateRosterEntry(
    userId: string,
    body: Partial<{ displayName: string; siteLocationId: string; teamId: string; shiftId: string; appRole: 'manager' | 'user' }>,
  ): Promise<any> {
    return apiFetch(`/org/roster/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async updateOrgSettings(payload: {
    teams?: { id: string; name: string }[];
    shifts?: { id: string; name: string }[];
    siteLocations?: { id: string; label: string }[];
  }): Promise<any> {
    return apiFetch('/org/settings', { method: 'PUT', body: JSON.stringify(payload) });
  },

  async regenerateInvite(): Promise<any> {
    return apiFetch('/org/regenerate-invite', { method: 'POST', body: '{}' });
  },
};