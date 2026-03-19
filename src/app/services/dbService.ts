/**
 * Direct Supabase DB service — used for tables that aren't
 * covered by the edge-function server (categories, plant_users).
 */
import { supabase } from "../../lib/supabaseClient";

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

export async function fetchCategories(): Promise<{ categories: Category[]; fromDB: boolean }> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, color, is_default")
      .order("name");

    if (error) {
      // Table doesn't exist yet — return fallback
      return { categories: FALLBACK_CATEGORIES, fromDB: false };
    }
    return { categories: (data ?? []) as Category[], fromDB: true };
  } catch {
    return { categories: FALLBACK_CATEGORIES, fromDB: false };
  }
}

export async function createCategory(name: string): Promise<Category | null> {
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
  try {
    const { data, error } = await supabase
      .from("plant_users")
      .select("id, name, email, role, team")
      .in("role", ["manager", "admin"])
      .order("name");

    if (error) {
      return { users: [], fromDB: false };
    }
    return { users: (data ?? []) as PlantUser[], fromDB: true };
  } catch {
    return { users: [], fromDB: false };
  }
}

export async function fetchAllPlantUsers(): Promise<PlantUser[]> {
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
  const [catRes, usersRes] = await Promise.all([
    supabase.from("categories").select("id").limit(1),
    supabase.from("plant_users").select("id").limit(1),
  ]);
  return {
    categoriesOk: !catRes.error,
    usersOk:      !usersRes.error,
  };
}
