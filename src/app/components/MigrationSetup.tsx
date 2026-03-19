import { useState } from "react";
import { Database, Copy, Check, ExternalLink, X, ChevronDown, ChevronUp } from "lucide-react";

const SQL = `-- Run this in Supabase Dashboard → SQL Editor → New Query → Run

CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        UNIQUE NOT NULL,
  color       TEXT        DEFAULT '#2abaad',
  is_default  BOOLEAN     DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO public.categories (name, color, is_default) VALUES
  ('Safety','#ef4444',true),('Quality','#6366f1',true),
  ('Maintenance','#f59e0b',true),('Compliance','#10b981',true),
  ('HR','#ec4899',true),('Operations','#f97316',true),('Other','#94a3b8',true)
ON CONFLICT (name) DO NOTHING;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "cat_read"  ON public.categories FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "cat_write" ON public.categories FOR ALL    USING (true);

CREATE TABLE IF NOT EXISTS public.plant_users (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  email       TEXT        UNIQUE,
  role        TEXT        DEFAULT 'user' CHECK (role IN ('user','manager','admin')),
  team        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.plant_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "pu_read"  ON public.plant_users FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "pu_write" ON public.plant_users FOR ALL    USING (true);`;

interface MigrationSetupProps {
  onDismiss: () => void;
}

export function MigrationSetup({ onDismiss }: MigrationSetupProps) {
  const [copied, setCopied]     = useState(false);
  const [expanded, setExpanded] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mx-4 sm:mx-auto sm:max-w-2xl mt-4 bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-start justify-between gap-3 px-4 py-3.5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <Database className="w-4 h-4 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900">Database setup required</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Run a one-time SQL migration to enable the Categories and Users dropdowns.
            </p>
          </div>
        </div>
        <button type="button" onClick={onDismiss}
          className="p-1 rounded-lg hover:bg-amber-100 text-amber-500 transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 pb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://supabase.com/dashboard/project/hchmskxcjgfscummckcp/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Supabase SQL Editor
          </a>
          <button type="button" onClick={copy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              copied ? "bg-teal-50 text-teal-700 border border-teal-200" : "bg-white border border-amber-200 text-amber-700 hover:bg-amber-100"
            }`}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy SQL"}
          </button>
          <button type="button" onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 transition-colors ml-auto">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Hide SQL" : "Show SQL"}
          </button>
        </div>

        {expanded && (
          <pre className="text-[11px] bg-amber-900/10 text-amber-900 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
            {SQL}
          </pre>
        )}

        <p className="text-[11px] text-amber-600">
          After running: refresh the page and the dropdowns will load from your database.
          Until then, a built-in list of categories is used as fallback.
        </p>
      </div>
    </div>
  );
}
