/**
 * Direct Supabase DB service — used for tables that aren't
 * covered by the edge-function server (categories, plant_users).
 *
 * If those tables were never created, PostgREST returns 404 (PGRST205).
 * Run `supabase/migrations/001_create_categories_and_plant_users.sql` in the
 * SQL Editor, or set VITE_SKIP_DIRECT_DB_TABLES=true to avoid the requests.
 */
import { supabase } from "../../lib/supabaseClient";

function skipDirectDbTables(): boolean {
  const v = import.meta.env.VITE_SKIP_DIRECT_DB_TABLES;
  return v === "true" || v === "1" || String(v).toLowerCase() === "yes";
}

/** PostgREST: table not in schema cache (migration not applied). */
function isMissingTableError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? "";
  const msg = (err.message ?? "").toLowerCase();
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    msg.includes("could not find the table") ||
    msg.includes("schema cache")
  );
}

export interface Category {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
}

export interface PlantUser {
  id: string;
  name: string;
  email: string | null;
  role: "user" | "manager" | "admin";
  team: string | null;
}

/* ─── Categories ─────────────────────────────────────────── */

const FALLBACK_CATEGORIES: Category[] = [
  { id: "1", name: "Safety",      color: "#ef4444", is_default: true },
  { id: "2", name: "Quality",     color: "#6366f1", is_default: true },
  { id: "3", name: "Maintenance", color: "#f59e0b", is_default: true },
  { id: "4", name: "Compliance",  color: "#10b981", is_default: true },
  { id: "5", name: "HR",          color: "#ec4899", is_default: true },
  { id: "6", name: "Operations",  color: "#f97316", is_default: true },
  { id: "7", name: "Other",       color: "#94a3b8", is_default: true },
];

/** Shown when plant_users table is missing (same 404 / PGRST205 as categories). */
const FALLBACK_MANAGERS: PlantUser[] = [
  {
    id: "00000000-0000-4000-8000-0000000000a1",
    name: "Site Manager",
    email: null,
    role: "manager",
    team: null,
  },
  {
    id: "00000000-0000-4000-8000-0000000000a2",
    name: "Safety Lead",
    email: null,
    role: "manager",
    team: null,
  },
];

export async function fetchCategories(): Promise<{ categories: Category[]; fromDB: boolean }> {
  if (skipDirectDbTables()) {
    return { categories: FALLBACK_CATEGORIES, fromDB: false };
  }
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, color, is_default")
      .order("name");

    if (error) {
      return { categories: FALLBACK_CATEGORIES, fromDB: false };
    }
    return { categories: (data ?? []) as Category[], fromDB: true };
  } catch {
    return { categories: FALLBACK_CATEGORIES, fromDB: false };
  }
}

export async function createCategory(name: string): Promise<Category | null> {
  if (skipDirectDbTables()) return null;
  const color = "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: name.trim(), color, is_default: false })
    .select()
    .single();

  if (error) return null;
  return data as Category;
}

/* ─── Plant Users ────────────────────────────────────────── */

export async function fetchManagers(): Promise<{ users: PlantUser[]; fromDB: boolean }> {
  if (skipDirectDbTables()) {
    return { users: FALLBACK_MANAGERS, fromDB: false };
  }
  try {
    const { data, error } = await supabase
      .from("plant_users")
      .select("id, name, email, role, team")
      .in("role", ["manager", "admin"])
      .order("name");

    if (error) {
      if (isMissingTableError(error)) {
        return { users: FALLBACK_MANAGERS, fromDB: false };
      }
      return { users: [], fromDB: false };
    }
    return { users: (data ?? []) as PlantUser[], fromDB: true };
  } catch {
    return { users: FALLBACK_MANAGERS, fromDB: false };
  }
}

export async function fetchAllPlantUsers(): Promise<PlantUser[]> {
  if (skipDirectDbTables()) return [];
  try {
    const { data, error } = await supabase
      .from("plant_users")
      .select("id, name, email, role, team")
      .order("name");
    if (error) return [];
    return (data ?? []) as PlantUser[];
  } catch {
    return [];
  }
}

export async function createPlantUser(
  name: string, email?: string, role: "user" | "manager" = "user"
): Promise<PlantUser | null> {
  if (skipDirectDbTables()) return null;
  const { data, error } = await supabase
    .from("plant_users")
    .insert({ name: name.trim(), email: email?.trim() || null, role })
    .select()
    .single();
  if (error) return null;
  return data as PlantUser;
}

/** Check whether both required tables exist */
export async function checkMigrationStatus(): Promise<{ categoriesOk: boolean; usersOk: boolean }> {
  if (skipDirectDbTables()) {
    return { categoriesOk: false, usersOk: false };
  }
  const [catRes, usersRes] = await Promise.all([
    supabase.from("categories").select("id").limit(1),
    supabase.from("plant_users").select("id").limit(1),
  ]);
  return {
    categoriesOk: !catRes.error,
    usersOk: !usersRes.error,
  };
}
