import * as kv from "./kv_store.tsx";
import type { AppRole, UserProfile } from "./context.tsx";

export const DEMO_TENANT = "demo_tenant";
export const DEMO_USER_MANAGER = "demo_manager";
export const DEMO_USER_OPERATOR = "demo_operator";

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

let seedPromise: Promise<void> | null = null;

/** One shared tenant + two users (manager / operator) for role-picker demo mode. */
export function ensureDemoTenant(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const orgRaw = parseKv(await kv.get(`tenant_org:${DEMO_TENANT}`));
      if (orgRaw?.tenantId) return;

      const inviteCode = "DEMO2026";
      const org = {
        tenantId: DEMO_TENANT,
        teams: [...DEFAULT_TEAMS],
        shifts: [...DEFAULT_SHIFTS],
        siteLocations: [...DEFAULT_SITE_LOCATIONS],
        inviteCode,
        updatedAt: Date.now(),
      };
      await kv.set(`tenant_org:${DEMO_TENANT}`, org);
      await kv.set(`invite_lookup:${inviteCode}`, { tenantId: DEMO_TENANT, createdAt: Date.now() });

      const now = Date.now();
      const mgr: UserProfile = {
        userId: DEMO_USER_MANAGER,
        email: "manager@demo.local",
        tenantId: DEMO_TENANT,
        appRole: "manager",
        displayName: "Demo Manager",
        updatedAt: now,
      };
      const op: UserProfile = {
        userId: DEMO_USER_OPERATOR,
        email: "operator@demo.local",
        tenantId: DEMO_TENANT,
        appRole: "user",
        displayName: "Demo Operator",
        updatedAt: now,
      };
      await kv.set(`user_profile:${DEMO_USER_MANAGER}`, mgr);
      await kv.set(`user_profile:${DEMO_USER_OPERATOR}`, op);

      await kv.set(`tenant_roster:${DEMO_TENANT}:${DEMO_USER_MANAGER}`, {
        userId: DEMO_USER_MANAGER,
        email: mgr.email,
        displayName: "Demo Manager",
        siteLocationId: DEFAULT_SITE_LOCATIONS[0].id,
        teamId: DEFAULT_TEAMS[0].id,
        shiftId: DEFAULT_SHIFTS[0].id,
        appRole: "manager" as AppRole,
        updatedAt: now,
      });
      await kv.set(`tenant_roster:${DEMO_TENANT}:${DEMO_USER_OPERATOR}`, {
        userId: DEMO_USER_OPERATOR,
        email: op.email,
        displayName: "Demo Operator",
        siteLocationId: DEFAULT_SITE_LOCATIONS[0].id,
        teamId: DEFAULT_TEAMS[0].id,
        shiftId: DEFAULT_SHIFTS[0].id,
        appRole: "user" as AppRole,
        updatedAt: now,
      });
    })();
  }
  return seedPromise;
}

export function demoUserIdForRole(role: AppRole): string {
  return role === "manager" ? DEMO_USER_MANAGER : DEMO_USER_OPERATOR;
}
