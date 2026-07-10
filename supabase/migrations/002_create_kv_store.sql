-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Create the key-value store table used by the Edge function
-- and the seed script (server/kv_store.ts, supabase/functions/.../kv_store.tsx).
--
-- Run this in your NEW project:
--   Supabase Dashboard → SQL Editor → New Query → paste → Run
--   Project: gjobazdxqqmmqpksqdwk
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.kv_store_d5ac9b81 (
  key   TEXT  NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

-- RLS: keep it ON. The Edge function and the seed script use the SERVICE ROLE
-- key, which bypasses RLS. The anon/publishable key never touches this table
-- directly, so no anon policy is required.
ALTER TABLE public.kv_store_d5ac9b81 ENABLE ROW LEVEL SECURITY;
