-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 001: Create categories and plant_users tables
-- Run this in the Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Categories ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        UNIQUE NOT NULL,
  color       TEXT        DEFAULT '#2abaad',
  is_default  BOOLEAN     DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default categories
INSERT INTO public.categories (name, color, is_default) VALUES
  ('Safety',      '#ef4444', true),
  ('Quality',     '#6366f1', true),
  ('Maintenance', '#f59e0b', true),
  ('Compliance',  '#10b981', true),
  ('HR',          '#ec4899', true),
  ('Operations',  '#f97316', true),
  ('Other',       '#94a3b8', true)
ON CONFLICT (name) DO NOTHING;

-- RLS: anyone can read, anyone can write (adjust per your auth setup)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_read"   ON public.categories;
DROP POLICY IF EXISTS "categories_write"  ON public.categories;

CREATE POLICY "categories_read"  ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_write" ON public.categories FOR ALL    USING (true);

-- ── Plant Users ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plant_users (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  email       TEXT        UNIQUE,
  role        TEXT        DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin')),
  team        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: anyone can read, anyone can write
ALTER TABLE public.plant_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plant_users_read"   ON public.plant_users;
DROP POLICY IF EXISTS "plant_users_write"  ON public.plant_users;

CREATE POLICY "plant_users_read"  ON public.plant_users FOR SELECT USING (true);
CREATE POLICY "plant_users_write" ON public.plant_users FOR ALL    USING (true);
