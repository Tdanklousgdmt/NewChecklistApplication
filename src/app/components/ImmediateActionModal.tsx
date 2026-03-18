import React, { useState, useRef, useEffect } from "react";
import {
  X, Zap, ChevronDown, Search, User, Tag, Layers, Check, Loader2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "/utils/supabase/info";

// ── Constants ──────────────────────────────────────────────────────────────────

const ACTION_DESCRIPTIONS = [
  "Barriers, signs and physical measures to isolate the hazard",
  "Cleaning Spills",
  "Conduct a preliminary assessment",
  "Document the event",
  "Ensure emergency procedures are in place",
  "Evacuate the area",
  "Isolate energy sources (LOTO)",
  "Notify supervisor or safety officer",
  "Provide first aid",
  "Remove damaged or defective equipment",
  "Repair or replace faulty component",
  "Restore safe conditions before resuming work",
  "Secure the work area",
  "Stop the operation immediately",
  "Update risk assessment",
];

const USERS = [
  { id: "T0327462", name: "TETE DANKLOU" },
  { id: "T0218345", name: "MARC LEBLANC" },
  { id: "T0419876", name: "SOFIA MARTIN" },
  { id: "T0531204", name: "JAMES OKORO" },
  { id: "T0674531", name: "AMINA CISSÉ" },
  { id: "T0782910", name: "PIERRE DURAND" },
  { id: "T0893217", name: "NADIA KOWALSKI" },
  { id: "T0965432", name: "KEVIN ADJEI" },
];

const CATEGORIES: Record<string, string[]> = {
  Safety: ["PPE", "Lockout / Tagout", "Fire Safety", "Emergency Response", "Permit to Work"],
  Maintenance: ["Electrical", "Mechanical", "Instrumentation", "Civil Works", "Preventive"],
  Operations: ["Process Control", "Quality", "Environment", "Housekeeping", "Production"],
  HSE: ["Hazard Identification", "Risk Assessment", "Incident Investigation", "Audit & Inspection"],
  Equipment: ["Inspection", "Repair", "Calibration", "Replacement", "Commissioning"],
};

// ── Helpers ────────────────────────────────────────────────────────────────────

async function saveImmediateAction(action: object) {
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-d5ac9b81/immediate-actions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey,
      },
      body: JSON.stringify(action),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.details || err.error || "Failed to save immediate action");
  }
  return res.json();
}

// ── Searchable Dropdown ────────────────────────────────────────────────────────

function SearchableDropdown({
  label,
  placeholder,
  options,
  value,
  onChange,
  required,
  error,
  disabled,
}: {
  label: string;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-1" ref={ref}>
      <label className="block text-sm font-semibold text-gray-800">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => { if (!disabled) setOpen((o) => !o); }}
          className={`w-full flex items-center justify-between px-4 py-3 border-2 rounded-lg text-sm transition-colors bg-white ${
            disabled
              ? "border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50"
              : error
              ? "border-red-400"
              : open
              ? "border-red-500 ring-1 ring-red-300"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <span className={value ? "text-gray-800" : "text-gray-400"}>
            {value || placeholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform shrink-0 ${
              open ? "rotate-180 text-red-500" : "text-red-500"
            }`}
          />
        </button>

        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden">
            {/* Search input */}
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-400">
                <Search className="w-4 h-4 shrink-0" />
                <input
                  autoFocus
                  className="w-full text-sm outline-none text-gray-700 placeholder-gray-400"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            {/* Options */}
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400 text-center">No results</p>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => { onChange(opt); setOpen(false); setSearch(""); }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between ${
                      opt === value
                        ? "bg-gray-100 font-semibold text-gray-900"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {opt}
                    {opt === value && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                ))
              )}
            </div>
            {/* Footer mirrors the placeholder like in the mockup */}
            <div className="border-t border-red-400 px-4 py-2 flex items-center justify-between bg-white">
              <span className="text-xs text-gray-400">{placeholder}</span>
              <ChevronDown className="w-3.5 h-3.5 text-red-500 rotate-180" />
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// ── Simple Dropdown (no search) ────────────────────────────────────────────────

function SimpleDropdown({
  label,
  placeholder,
  options,
  value,
  onChange,
  required,
  error,
  disabled,
}: {
  label: string;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-1" ref={ref}>
      <label className="block text-sm font-semibold text-gray-800">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => { if (!disabled) setOpen((o) => !o); }}
          className={`w-full flex items-center justify-between px-4 py-3 border-2 rounded-lg text-sm transition-colors bg-white ${
            disabled
              ? "border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50"
              : error
              ? "border-red-400"
              : open
              ? "border-gray-400 ring-1 ring-gray-200"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <span className={value ? "text-gray-800" : "text-gray-400"}>
            {value || placeholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform shrink-0 ${
              open ? "rotate-180 text-gray-600" : "text-gray-500"
            }`}
          />
        </button>

        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between ${
                  opt === value
                    ? "bg-gray-100 font-semibold text-gray-900"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {opt}
                {opt === value && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface ImmediateActionModalProps {
  checklistId: string;
  checklistTitle: string;
  onClose: () => void;
  onSaved?: (action: any) => void;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ImmediateActionModal({
  checklistId,
  checklistTitle,
  onClose,
  onSaved,
}: ImmediateActionModalProps) {
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    actionDescription: "",
    actionOwner: "",
    category: "",
    subcategory: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: string, value: string) => {
    setForm((f) => ({
      ...f,
      [field]: value,
      // Reset subcategory when category changes
      ...(field === "category" ? { subcategory: "" } : {}),
    }));
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const userOptions = USERS.map((u) => `${u.id} - ${u.name}`);
  const subcategoryOptions = form.category ? CATEGORIES[form.category] ?? [] : [];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.actionDescription) e.actionDescription = "Action description is required";
    if (!form.actionOwner)       e.actionOwner       = "Action owner is required";
    if (!form.category)          e.category          = "Category is required";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setSaving(true);
    try {
      const payload = {
        checklistId,
        actionDescription: form.actionDescription,
        actionOwner: form.actionOwner,
        category: form.category,
        subcategory: form.subcategory || null,
      };
      const result = await saveImmediateAction(payload);
      toast.success("Immediate action saved successfully");
      onSaved?.(result.action);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save immediate action");
    } finally {
      setSaving(false);
    }
  };

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 py-5 bg-gradient-to-r from-orange-500 to-red-500">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white">Immediate Action</h2>
            <p className="text-xs text-white/75 truncate mt-0.5">{checklistTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Action Description */}
          <SearchableDropdown
            label="Action description"
            placeholder="Select the type of immediate actions"
            options={ACTION_DESCRIPTIONS}
            value={form.actionDescription}
            onChange={(v) => set("actionDescription", v)}
            required
            error={errors.actionDescription}
          />

          {/* Action Owner */}
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-800">
              Action owner <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              {/* Reuse SimpleDropdown logic inline for user list */}
              <SimpleDropdown
                label=""
                placeholder="Select the action owner"
                options={userOptions}
                value={form.actionOwner}
                onChange={(v) => set("actionOwner", v)}
                required
                error={errors.actionOwner}
              />
            </div>
          </div>

          {/* Category + Subcategory */}
          <div className="grid grid-cols-2 gap-4">
            <SearchableDropdown
              label="Category"
              placeholder="Select the category"
              options={Object.keys(CATEGORIES)}
              value={form.category}
              onChange={(v) => set("category", v)}
              required
              error={errors.category}
            />
            <SimpleDropdown
              label="Subcategory"
              placeholder="Select the subcategory"
              options={subcategoryOptions}
              value={form.subcategory}
              onChange={(v) => set("subcategory", v)}
              disabled={!form.category}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              <><Zap className="w-4 h-4" /> Save Action</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
