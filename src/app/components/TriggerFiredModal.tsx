import React, { useState } from "react";
import { X, Zap, AlertTriangle, Tag, Wrench, FileWarning, Bell, Mail, EyeOff, Eye, PenLine, MessageSquare, CheckCircle2 } from "lucide-react";
import { TriggerImpact, TriggerImpactType, getImpactDef } from "../types/triggers";

// ── Impact icon mapping ───────────────────────────────────────────────────────
const IMPACT_ICONS: Record<TriggerImpactType, React.ReactNode> = {
  mark_not_ok:    <AlertTriangle className="w-4 h-4" />,
  block_submit:   <X className="w-4 h-4" />,
  open_risk:      <FileWarning className="w-4 h-4" />,
  open_tag:       <Tag className="w-4 h-4" />,
  open_action:    <Wrench className="w-4 h-4" />,
  escalate:       <AlertTriangle className="w-4 h-4" />,
  notify_inapp:   <Bell className="w-4 h-4" />,
  notify_email:   <Mail className="w-4 h-4" />,
  add_note:       <PenLine className="w-4 h-4" />,
  require_photo:  <MessageSquare className="w-4 h-4" />,
  hide_field:     <EyeOff className="w-4 h-4" />,
  show_field:     <Eye className="w-4 h-4" />,
  autofill_field: <CheckCircle2 className="w-4 h-4" />,
};

// ── Note prompt sub-component ─────────────────────────────────────────────────
function NotePrompt({
  prompt,
  onSubmit,
}: {
  prompt: string;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-indigo-700">{prompt}</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Type your note here…"
        rows={3}
        className="w-full px-3 py-2 border border-indigo-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white resize-none transition-all"
      />
      <button
        type="button"
        onClick={() => { if (note.trim()) onSubmit(note.trim()); }}
        disabled={!note.trim()}
        className="w-full py-2 rounded-xl bg-indigo-500 text-white text-xs font-semibold disabled:opacity-40 hover:bg-indigo-600 transition-colors"
      >
        Submit Note
      </button>
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface TriggerFiredModalProps {
  fieldLabel: string;
  impacts: TriggerImpact[];
  onDismiss: () => void;
  onOpenTag?: () => void;
  onOpenAction?: () => void;
  onOpenRisk?: () => void;
  onNoteSubmitted?: (note: string, prompt: string) => void;
}

// ── Main component ─────────────────────────────────────────────────────────────
export function TriggerFiredModal({
  fieldLabel,
  impacts,
  onDismiss,
  onOpenTag,
  onOpenAction,
  onOpenRisk,
  onNoteSubmitted,
}: TriggerFiredModalProps) {
  // Find add_note impact (only show first one)
  const noteImpact = impacts.find((i) => i.type === "add_note");
  const [noteSubmitted, setNoteSubmitted] = useState(false);

  const handleNoteSubmit = (note: string) => {
    if (noteImpact?.payload?.notePrompt) {
      onNoteSubmitted?.(note, noteImpact.payload.notePrompt);
    }
    setNoteSubmitted(true);
  };

  // Categorise impacts for display
  const blocking   = impacts.filter((i) => i.type === "mark_not_ok" || i.type === "block_submit");
  const actions    = impacts.filter((i) => ["open_risk", "open_tag", "open_action"].includes(i.type));
  const passive    = impacts.filter((i) => ["notify_inapp", "notify_email", "escalate", "require_photo", "hide_field", "show_field", "autofill_field"].includes(i.type));
  const noteImpacts = impacts.filter((i) => i.type === "add_note");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
        onClick={onDismiss}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[90] bg-white rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800">Trigger Activated</p>
            <p className="text-xs text-gray-400 truncate">Field: {fieldLabel}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">

          {/* Blocking impacts */}
          {blocking.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Applied automatically</p>
              {blocking.map((impact, i) => {
                const def = getImpactDef(impact.type);
                return (
                  <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${def.borderColor} ${def.color}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${def.textColor} bg-white/60`}>
                      {IMPACT_ICONS[impact.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${def.textColor}`}>{def.emoji} {def.label}</p>
                      {impact.payload?.message && (
                        <p className="text-xs text-gray-600 mt-0.5">{impact.payload.message}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Passive impacts */}
          {passive.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Applied in background</p>
              {passive.map((impact, i) => {
                const def = getImpactDef(impact.type);
                return (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${def.borderColor} ${def.color}`}>
                    <span className="text-base">{def.emoji}</span>
                    <div className="flex-1">
                      <p className={`text-xs font-semibold ${def.textColor}`}>{def.label}</p>
                      {impact.payload?.userName && (
                        <p className="text-[10px] text-gray-500">→ {impact.payload.userName}</p>
                      )}
                      {impact.payload?.emailAddress && (
                        <p className="text-[10px] text-gray-500">→ {impact.payload.emailAddress}</p>
                      )}
                      {impact.payload?.message && (
                        <p className="text-[10px] text-gray-500">{impact.payload.message}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action-required impacts */}
          {actions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Action required</p>
              {actions.map((impact, i) => {
                const def = getImpactDef(impact.type);
                const handler =
                  impact.type === "open_tag" ? onOpenTag :
                  impact.type === "open_action" ? onOpenAction :
                  impact.type === "open_risk" ? onOpenRisk : undefined;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { handler?.(); onDismiss(); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${def.borderColor} ${def.color} hover:brightness-95 transition-all text-left`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${def.textColor} bg-white/60`}>
                      {IMPACT_ICONS[impact.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${def.textColor}`}>{def.emoji} {def.label}</p>
                      {impact.payload?.message && (
                        <p className="text-xs text-gray-600 mt-0.5">{impact.payload.message}</p>
                      )}
                    </div>
                    <span className={`text-xs font-bold ${def.textColor} shrink-0`}>Open →</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Note impacts */}
          {noteImpacts.length > 0 && !noteSubmitted && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Note required</p>
              <div className="px-4 py-3 rounded-xl border border-indigo-200 bg-indigo-50">
                <div className="flex items-center gap-2 mb-1">
                  <PenLine className="w-4 h-4 text-indigo-500 shrink-0" />
                  <p className="text-xs font-semibold text-indigo-700">Mandatory note</p>
                </div>
                <NotePrompt
                  prompt={noteImpacts[0].payload?.notePrompt || "Please add a note to continue…"}
                  onSubmit={handleNoteSubmit}
                />
              </div>
            </div>
          )}

          {noteSubmitted && (
            <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-xs text-green-700 font-semibold">Note submitted successfully</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onDismiss}
            disabled={noteImpacts.length > 0 && !noteSubmitted}
            className="w-full py-3 rounded-2xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-40"
          >
            {noteImpacts.length > 0 && !noteSubmitted ? "Submit note to continue" : "Dismiss"}
          </button>
        </div>
      </div>
    </>
  );
}
