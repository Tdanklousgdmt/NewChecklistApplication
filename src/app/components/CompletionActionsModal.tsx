import { useState, useEffect } from "react";
import React from "react";
import {
  X, Check, Loader2, ChevronDown, ChevronUp,
  Calendar, Zap, Shield, Tag, Send, AlertCircle, Sparkles,
  Flag, User, Clock, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "/utils/supabase/info";

// ── API helper ──────────────────────────────────────────────────────────────
const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-d5ac9b81`;
async function apiPost(endpoint: string, body: object) {
  const res = await fetch(`${SERVER}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${publicAnonKey}`,
      apikey: publicAnonKey,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

// ── Types ───────────────────────────────────────────────────────────────────
type ActionType = "closure" | "action" | "risk" | "tag";

interface CompletionActionsModalProps {
  checklistId: string;
  checklistTitle: string;
  checklistLocation?: string;
  reviewers?: string[];
  submissionId?: string | null;
  onClose: () => void;
  onConfirm: () => void; // triggers the actual submit
  submitting: boolean;
}

// ── Sub-forms ───────────────────────────────────────────────────────────────

// Shared pill selector
function PillSelector({
  options,
  value,
  onChange,
  colorMap,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  colorMap: Record<string, string>;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold border-2 transition-all active:scale-95 ${
            value === o.value
              ? colorMap[o.value] + " shadow-sm"
              : "border-gray-200 bg-white text-gray-500"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Closure Event form
function ClosureForm({
  checklistId,
  submissionId,
  onSaved,
}: {
  checklistId: string;
  submissionId?: string | null;
  onSaved: () => void;
}) {
  const [title, setTitle]         = useState("");
  const [description, setDesc]   = useState("");
  const [date, setDate]           = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const save = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    try {
      await apiPost("/closure-events", {
        checklistId,
        submissionId: submissionId || null,
        title: title.trim(),
        description: description.trim(),
        closureDate: date || null,
      });
      toast.success("Closure event saved");
      onSaved();
    } catch (err: any) {
      console.error("Error saving closure event:", err);
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-3">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Event title <span className="text-red-400">*</span></label>
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(""); }}
          placeholder="e.g. Corrective measure applied"
          className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-400 rounded-2xl text-sm focus:outline-none transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Describe what was done to close out this checklist…"
          rows={3}
          className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-400 rounded-2xl text-sm resize-none focus:outline-none transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Closure date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-400 rounded-2xl text-sm focus:outline-none transition-colors"
        />
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</p>
      )}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-500 text-white rounded-2xl text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-all shadow-sm"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Save Closure Event
      </button>
    </div>
  );
}

// Action Item form
function ActionItemForm({
  checklistId,
  submissionId,
  onSaved,
}: {
  checklistId: string;
  submissionId?: string | null;
  onSaved: () => void;
}) {
  const [title, setTitle]       = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate]   = useState("");
  const [priority, setPriority] = useState("normal");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const priorityOptions = [
    { value: "low",    label: "Low"    },
    { value: "normal", label: "Normal" },
    { value: "high",   label: "High"   },
    { value: "urgent", label: "Urgent" },
  ];
  const priorityColors: Record<string, string> = {
    low:    "bg-gray-100 text-gray-700 border-gray-300",
    normal: "bg-blue-100 text-blue-700 border-blue-400",
    high:   "bg-orange-100 text-orange-700 border-orange-400",
    urgent: "bg-red-100 text-red-700 border-red-400",
  };

  const save = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    try {
      await apiPost("/action-items", {
        checklistId,
        submissionId: submissionId || null,
        title: title.trim(),
        assignee: assignee.trim(),
        dueDate: dueDate || null,
        priority,
      });
      toast.success("Action item saved");
      onSaved();
    } catch (err: any) {
      console.error("Error saving action item:", err);
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-3">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Action title <span className="text-red-400">*</span></label>
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(""); }}
          placeholder="e.g. Replace faulty valve by Friday"
          className="w-full px-4 py-3 border-2 border-gray-200 focus:border-orange-400 rounded-2xl text-sm focus:outline-none transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Assignee</label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
          <input
            type="text"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="Name or team"
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 focus:border-orange-400 rounded-2xl text-sm focus:outline-none transition-colors"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Due date</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full pl-9 pr-3 py-3 border-2 border-gray-200 focus:border-orange-400 rounded-2xl text-sm focus:outline-none transition-colors"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3 py-3 border-2 border-gray-200 focus:border-orange-400 rounded-2xl text-sm focus:outline-none transition-colors bg-white"
          >
            {priorityOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</p>
      )}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-orange-500 text-white rounded-2xl text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-all shadow-sm"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Save Action Item
      </button>
    </div>
  );
}

// Risk Assessment form
function RiskAssessmentForm({
  checklistId,
  submissionId,
  onSaved,
}: {
  checklistId: string;
  submissionId?: string | null;
  onSaved: () => void;
}) {
  const [description, setDesc]   = useState("");
  const [likelihood, setLikelihood] = useState("medium");
  const [impact, setImpact]         = useState("medium");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  const levels = [
    { value: "low",    label: "Low"    },
    { value: "medium", label: "Medium" },
    { value: "high",   label: "High"   },
  ];
  const levelColors: Record<string, string> = {
    low:    "bg-green-100 text-green-700 border-green-400",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-400",
    high:   "bg-red-100 text-red-700 border-red-400",
  };

  const computedRisk = (() => {
    const l = { low: 1, medium: 2, high: 3 }[likelihood] ?? 2;
    const i = { low: 1, medium: 2, high: 3 }[impact] ?? 2;
    const score = l * i;
    if (score >= 6) return { label: "High Risk", cls: "bg-red-100 text-red-700 border-red-200" };
    if (score >= 3) return { label: "Medium Risk", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" };
    return { label: "Low Risk", cls: "bg-green-100 text-green-700 border-green-200" };
  })();

  const save = async () => {
    if (!description.trim()) { setError("Description is required"); return; }
    setSaving(true);
    setError("");
    try {
      await apiPost("/risk-assessments", {
        checklistId,
        submissionId: submissionId || null,
        description: description.trim(),
        likelihood,
        impact,
      });
      toast.success("Risk assessment saved");
      onSaved();
    } catch (err: any) {
      console.error("Error saving risk assessment:", err);
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pt-3">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Risk description <span className="text-red-400">*</span></label>
        <textarea
          value={description}
          onChange={(e) => { setDesc(e.target.value); setError(""); }}
          placeholder="Describe the potential risk identified during this checklist…"
          rows={3}
          className="w-full px-4 py-3 border-2 border-gray-200 focus:border-red-400 rounded-2xl text-sm resize-none focus:outline-none transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">Likelihood</label>
        <PillSelector options={levels} value={likelihood} onChange={setLikelihood} colorMap={levelColors} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">Impact</label>
        <PillSelector options={levels} value={impact} onChange={setImpact} colorMap={levelColors} />
      </div>
      {/* Computed risk level */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border-2 ${computedRisk.cls}`}>
        <TrendingUp className="w-4 h-4 shrink-0" />
        <div>
          <p className="text-xs font-bold">Overall Risk Level</p>
          <p className="text-[11px] opacity-80">{computedRisk.label} — based on likelihood × impact</p>
        </div>
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</p>
      )}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-500 text-white rounded-2xl text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-all shadow-sm"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Save Risk Assessment
      </button>
    </div>
  );
}

// ── Option card ─────────────────────────────────────────────────────────────
function OptionCard({
  type,
  icon: Icon,
  title,
  description,
  accentCls,
  bgCls,
  borderCls,
  added,
  expanded,
  onExpand,
  children,
}: {
  type: ActionType;
  icon: React.ElementType;
  title: string;
  description: string;
  accentCls: string;
  bgCls: string;
  borderCls: string;
  added: boolean;
  expanded: boolean;
  onExpand: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border-2 transition-all overflow-hidden ${added ? "border-green-300 bg-green-50/50" : expanded ? borderCls + " " + bgCls : "border-gray-100 bg-white"}`}>
      {/* Header row */}
      <button
        type="button"
        onClick={onExpand}
        className="w-full flex items-center gap-3 px-4 py-4 text-left"
      >
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${added ? "bg-green-100" : accentCls}`}>
          {added
            ? <Check className="w-5 h-5 text-green-600" />
            : <Icon className="w-5 h-5 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${added ? "text-green-700" : "text-gray-800"}`}>
            {added ? `${title} — Added ✓` : title}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{description}</p>
        </div>
        {added ? null : (
          expanded
            ? <ChevronUp   className="w-4 h-4 text-gray-400 shrink-0" />
            : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>

      {/* Expandable form */}
      {expanded && !added && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main modal ──────────────────────────────────────────────────────────────
export function CompletionActionsModal({
  checklistId,
  checklistTitle,
  checklistLocation,
  reviewers,
  submissionId,
  onClose,
  onConfirm,
  submitting,
}: CompletionActionsModalProps) {
  const [expanded, setExpanded]   = useState<ActionType | null>(null);
  const [added, setAdded]         = useState<Set<ActionType>>(new Set());
  // For "Tag" we defer to the existing TagDeclarationModal — signal parent
  const [showTagModal, setShowTagModal] = useState(false);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const toggle = (type: ActionType) => {
    if (added.has(type)) return; // already saved
    if (type === "tag") {
      setShowTagModal(true);
      return;
    }
    setExpanded((prev) => prev === type ? null : type);
  };

  const markAdded = (type: ActionType) => {
    setAdded((prev) => new Set([...prev, type]));
    setExpanded(null);
  };

  const addedCount = added.size;

  const cards: {
    type: ActionType;
    icon: React.ElementType;
    title: string;
    description: string;
    accentCls: string;
    bgCls: string;
    borderCls: string;
  }[] = [
    {
      type: "closure",
      icon: Calendar,
      title: "Closure Event",
      description: "Document what was done to resolve or close out this checklist",
      accentCls: "bg-green-500",
      bgCls: "bg-green-50/60",
      borderCls: "border-green-300",
    },
    {
      type: "action",
      icon: Zap,
      title: "Action Item",
      description: "Assign a follow-up corrective action with an owner and deadline",
      accentCls: "bg-orange-500",
      bgCls: "bg-orange-50/60",
      borderCls: "border-orange-300",
    },
    {
      type: "risk",
      icon: Shield,
      title: "Risk Assessment",
      description: "Evaluate a potential risk: set its likelihood and impact level",
      accentCls: "bg-red-500",
      bgCls: "bg-red-50/60",
      borderCls: "border-red-300",
    },
    {
      type: "tag",
      icon: Tag,
      title: "Tag / Anomaly",
      description: "Flag an anomaly, assign responsibility and set criticality",
      accentCls: "bg-blue-500",
      bgCls: "bg-blue-50/60",
      borderCls: "border-blue-300",
    },
  ];

  // ── TagDeclarationModal is imported lazily to avoid circular deps
  // We render it in the same overlay if the user picks "Tag"
  const [TagModal, setTagModal] = useState<React.ComponentType<any> | null>(null);
  useEffect(() => {
    if (showTagModal && !TagModal) {
      import("./TagDeclarationModal").then((mod) => setTagModal(() => mod.TagDeclarationModal));
    }
  }, [showTagModal]);

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* ── Bottom sheet ──────────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[92dvh] bg-white rounded-t-3xl shadow-2xl"
        style={{ animation: "slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-teal-500 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 leading-tight">Before you submit…</h2>
                <p className="text-xs text-gray-400 mt-0.5">Would you like to add anything to complete this report?</p>
              </div>
            </div>
            <button type="button" onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 active:bg-gray-200 shrink-0 mt-0.5">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          {/* Checklist mini-info */}
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
            <Flag className="w-3.5 h-3.5 text-teal-500 shrink-0" />
            <p className="text-xs text-gray-600 truncate font-medium">{checklistTitle}</p>
          </div>
        </div>

        {/* Scrollable option list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 overscroll-contain">
          {cards.map((card) => (
            <OptionCard
              key={card.type}
              {...card}
              added={added.has(card.type)}
              expanded={expanded === card.type}
              onExpand={() => toggle(card.type)}
            >
              {card.type === "closure" && (
                <ClosureForm checklistId={checklistId} submissionId={submissionId} onSaved={() => markAdded("closure")} />
              )}
              {card.type === "action" && (
                <ActionItemForm checklistId={checklistId} submissionId={submissionId} onSaved={() => markAdded("action")} />
              )}
              {card.type === "risk" && (
                <RiskAssessmentForm checklistId={checklistId} submissionId={submissionId} onSaved={() => markAdded("risk")} />
              )}
            </OptionCard>
          ))}

          {/* "Added" summary pill */}
          {addedCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 bg-teal-50 border border-teal-200 rounded-2xl">
              <Check className="w-4 h-4 text-teal-500 shrink-0" />
              <p className="text-xs font-semibold text-teal-700">
                {addedCount} item{addedCount > 1 ? "s" : ""} added to your report
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-4 py-4 border-t border-gray-100 shrink-0 bg-white/95">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="flex-none px-5 py-3.5 rounded-2xl border-2 border-gray-200 text-sm font-semibold text-gray-500 active:bg-gray-50 transition-colors"
            >
              Skip & Submit
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-teal-500 text-white rounded-2xl text-sm font-bold shadow-md shadow-teal-200 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                : <><Send className="w-4 h-4" /> Complete &amp; Submit</>}
            </button>
          </div>
          <p className="text-center text-[11px] text-gray-400 mt-2">
            {addedCount > 0
              ? `${addedCount} extra item${addedCount > 1 ? "s" : ""} will be attached to your submission`
              : "Your checklist answers are ready to be submitted"}
          </p>
        </div>
      </div>

      {/* ── Tag modal ────────────────────────────────────────────────────── */}
      {showTagModal && TagModal && (
        <TagModal
          checklistId={checklistId}
          checklistTitle={checklistTitle}
          checklistLocation={checklistLocation || ""}
          reviewers={reviewers || []}
          onClose={() => setShowTagModal(false)}
          onSaved={() => { markAdded("tag"); setShowTagModal(false); }}
        />
      )}

      {/* Slide-up animation */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0.5; }
          to   { transform: translateY(0);    opacity: 1;   }
        }
      `}</style>
    </>
  );
}
