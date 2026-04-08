export type AppRole = "manager" | "user";

const KEY = "echeck_app_role";

export function getStoredAppRole(): AppRole | null {
  try {
    const v = sessionStorage.getItem(KEY);
    if (v === "manager" || v === "user") return v;
  } catch {
    /* private mode */
  }
  return null;
}

export function setAppRole(role: AppRole): void {
  try {
    sessionStorage.setItem(KEY, role);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("echeck-role-change"));
}

export function clearAppRole(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("echeck-role-change"));
}

/** For API headers only — after role screen, role is always set. */
export function getAppRole(): AppRole {
  return getStoredAppRole() ?? "manager";
}
