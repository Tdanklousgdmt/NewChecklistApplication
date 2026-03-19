import React, { useState } from "react";
import {
  Plus, X, Zap, ChevronDown, ChevronUp, Trash2, Copy,
  AlertTriangle, Info,
} from "lucide-react";
import {
  Trigger, TriggerEvent, TriggerImpact, TriggerImpactType,
  TriggerConditionType, FIELD_CONDITIONS, IMPACT_DEFS, ImpactDef,
  getImpactDef, summariseEvent, ConditionDef,
} from "../types/triggers";
import { CanvasField } from "./ChecklistStep2";

// ── Helpers ────────────────────────────────────────────────────────────────────
let _tid = 0;
const genTriggerId = () => `trg_${++_tid}_${Date.now()}`;

const EMPTY_EVENT: TriggerEvent = { condition: "is_empty" as TriggerConditionType };
const EMPTY_IMPACT: TriggerImpact = { type: "mark_not_ok", payload: {} };

// ── Sub-component: impact pill ─────────────────────────────────────────────────
function ImpactPill({ impact, onRemove }: { impact: TriggerImpact; onRemove: () => void }) {
  const def = getImpactDef(impact.type);
  return (
    <span className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-semibold border ${def.color} ${def.textColor} ${def.borderColor}`}>
      {def.emoji} {def.label}
      <button type="button" onClick={onRemove}
        className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors ml-0.5">
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}

// ── Sub-component: impact config ───────────────────────────────────────────────
function ImpactConfig({
  impact, onChange, allFields, currentFieldUid,
}: {
  impact: TriggerImpact;
  onChange: (updated: TriggerImpact) => void;
  allFields: CanvasField[];
  currentFieldUid: string;
}) {
  const def = getImpactDef(impact.type);
  const p = impact.payload ?? {};
  const inputCls = "w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all";
  const targetFields = allFields.filter((f) => f.uid !== currentFieldUid && !["section", "separator", "instruction"].includes(f.typeId));

  const up = (patch: Partial<typeof p>) =>
    onChange({ ...impact, payload: { ...p, ...patch } });

  return (
    <div className="flex flex-col gap-1.5 mt-1.5 pl-2 border-l-2 border-orange-100">
      {def.needs.includes("message") && (
        <input
          type="text"
          value={p.message ?? ""}
          onChange={(e) => up({ message: e.target.value })}
          placeholder="Optional message shown to the user…"
          className={inputCls}
        />
      )}
      {def.needs.includes("userName") && (
        <input
          type="text"
          value={p.userName ?? ""}
          onChange={(e) => up({ userName: e.target.value })}
          placeholder="Username or role (e.g. supervisor, QA manager)…"
          className={inputCls}
        />
      )}
      {def.needs.includes("emailAddress") && (
        <input
          type="email"
          value={p.emailAddress ?? ""}
          onChange={(e) => up({ emailAddress: e.target.value })}
          placeholder="Email address to notify…"
          className={inputCls}
        />
      )}
      {def.needs.includes("notePrompt") && (
        <input
          type="text"
          value={p.notePrompt ?? ""}
          onChange={(e) => up({ notePrompt: e.target.value })}
          placeholder="Prompt shown to user (e.g. Explain the issue…)"
          className={inputCls}
        />
      )}
      {(def.needs.includes("targetFieldUid") || def.needs.includes("autofill_field" as any)) && (
        <select
          value={p.targetFieldUid ?? ""}
          onChange={(e) => up({ targetFieldUid: e.target.value })}
          className={inputCls}
        >
          <option value="">— Select target field —</option>
          {targetFields.map((f) => (
            <option key={f.uid} value={f.uid}>{f.label || f.typeId}</option>
          ))}
        </select>
      )}
      {def.needs.includes("targetValue") && (
        <input
          type="text"
          value={p.targetValue ?? ""}
          onChange={(e) => up({ targetValue: e.target.value })}
          placeholder="Value to auto-fill…"
          className={inputCls}
        />
      )}
    </div>
  );
}

// ── Sub-component: single trigger row ────────────────────────────────────────────
function TriggerRow({
  trigger, field, allFields, onChange, onDelete,
}: {
  trigger: Trigger;
  field: CanvasField;
  allFields: CanvasField[];
  onChange: (t: Trigger) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editingImpactIdx, setEditingImpactIdx] = useState<number | null>(null);

  const conditions: ConditionDef[] = FIELD_CONDITIONS[field.typeId] ?? [];
  const activeCond = conditions.find((c) => c.condition === trigger.event.condition) ?? conditions[0];

  const updateEvent = (patch: Partial<TriggerEvent>) =>
    onChange({ ...trigger, event: { ...trigger.event, ...patch } });

  const addImpact = () => {
    const newImpact: TriggerImpact = { type: "mark_not_ok", payload: {} };
    const newTrigger = { ...trigger, impacts: [...trigger.impacts, newImpact] };
    onChange(newTrigger);
    setEditingImpactIdx(newTrigger.impacts.length - 1);
  };

  const updateImpact = (idx: number, updated: TriggerImpact) =>
    onChange({ ...trigger, impacts: trigger.impacts.map((im, i) => i === idx ? updated : im) });

  const removeImpact = (idx: number) =>
    onChange({ ...trigger, impacts: trigger.impacts.filter((_, i) => i !== idx) });

  const inputCls = "px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all";

  return (
    <div className="border border-orange-100 rounded-xl bg-orange-50/30 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-orange-100">
        <Zap className="w-3.5 h-3.5 text-orange-400 shrink-0" />
        <button
          type="button"
          className="flex-1 text-left text-xs font-medium text-gray-700 truncate"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-gray-400">WHEN </span>
          <span className="text-orange-600">{summariseEvent(trigger.event, field.typeId)}</span>
          {trigger.impacts.length > 0 && (
            <>
              <span className="text-gray-400"> → </span>
              <span className="text-indigo-600">{trigger.impacts.map(i => getImpactDef(i.type).label).join(" + ")}</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-orange-100 transition-colors text-gray-400"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-red-100 text-gray-300 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {expanded && (
        <div className="px-3 py-3 flex flex-col gap-3">

          {/* EVENT section */}
          <div>
            <p className="text-[9px] font-bold text-orange-500 uppercase tracking-widest mb-1.5">
              ⚡ When (Event)
            </p>
            <div className="flex flex-col gap-1.5">
              {/* Condition selector */}
              {conditions.length > 0 ? (
                <select
                  value={trigger.event.condition}
                  onChange={(e) => updateEvent({ condition: e.target.value as TriggerConditionType, value: undefined, value2: undefined, buttonId: undefined, windowStart: undefined, windowEnd: undefined })}
                  className={`w-full ${inputCls}`}
                >
                  {conditions.map((c) => (
                    <option key={c.condition} value={c.condition}>{c.label}</option>
                  ))}
                </select>
              ) : (
                <p className="text-[10px] text-gray-400 italic">No conditions available for this field type</p>
              )}

              {/* Value inputs based on valueType */}
              {activeCond?.hasValue && activeCond.valueType === "text" && (
                <input
                  type="text"
                  value={String(trigger.event.value ?? "")}
                  onChange={(e) => updateEvent({ value: e.target.value })}
                  placeholder="Enter value…"
                  className={`w-full ${inputCls}`}
                />
              )}

              {activeCond?.hasValue && activeCond.valueType === "number" && (
                <input
                  type="number"
                  value={trigger.event.value ?? ""}
                  onChange={(e) => updateEvent({ value: e.target.value === "" ? undefined : Number(e.target.value) })}
                  placeholder="Enter number…"
                  className={`w-full ${inputCls}`}
                />
              )}

              {activeCond?.hasValue && activeCond.valueType === "range" && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={trigger.event.value ?? ""}
                    onChange={(e) => updateEvent({ value: e.target.value === "" ? undefined : Number(e.target.value) })}
                    placeholder="Min"
                    className={`flex-1 ${inputCls}`}
                  />
                  <span className="text-xs text-gray-400 shrink-0">–</span>
                  <input
                    type="number"
                    value={trigger.event.value2 ?? ""}
                    onChange={(e) => updateEvent({ value2: e.target.value === "" ? undefined : Number(e.target.value) })}
                    placeholder="Max"
                    className={`flex-1 ${inputCls}`}
                  />
                </div>
              )}

              {activeCond?.hasValue && activeCond.valueType === "option" && (
                <select
                  value={String(trigger.event.value ?? "")}
                  onChange={(e) => updateEvent({ value: e.target.value })}
                  className={`w-full ${inputCls}`}
                >
                  <option value="">— Select option —</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {activeCond?.hasValue && activeCond.valueType === "button" && (
                <select
                  value={trigger.event.buttonId ?? ""}
                  onChange={(e) => updateEvent({ buttonId: e.target.value })}
                  className={`w-full ${inputCls}`}
                >
                  <option value="">— Select button —</option>
                  {(field.customButtons || []).map((btn) => (
                    <option key={btn.id} value={btn.id}>{btn.label}</option>
                  ))}
                </select>
              )}

              {activeCond?.hasValue && activeCond.valueType === "time" && (
                <input
                  type="time"
                  value={String(trigger.event.value ?? "")}
                  onChange={(e) => updateEvent({ value: e.target.value })}
                  className={`w-full ${inputCls}`}
                />
              )}

              {activeCond?.hasValue && activeCond.valueType === "time_window" && (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={trigger.event.windowStart ?? ""}
                    onChange={(e) => updateEvent({ windowStart: e.target.value })}
                    placeholder="Start"
                    className={`flex-1 ${inputCls}`}
                  />
                  <span className="text-xs text-gray-400 shrink-0">to</span>
                  <input
                    type="time"
                    value={trigger.event.windowEnd ?? ""}
                    onChange={(e) => updateEvent({ windowEnd: e.target.value })}
                    placeholder="End"
                    className={`flex-1 ${inputCls}`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* IMPACTS section */}
          <div>
            <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mb-1.5">
              💥 Then do (Impacts)
            </p>

            {trigger.impacts.length === 0 && (
              <p className="text-[10px] text-gray-400 italic mb-1.5">No impacts defined — add at least one.</p>
            )}

            <div className="flex flex-col gap-2">
              {trigger.impacts.map((impact, idx) => {
                const def = getImpactDef(impact.type);
                return (
                  <div key={idx} className={`rounded-lg border ${def.borderColor} ${def.color} p-2`}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{def.emoji}</span>
                      <select
                        value={impact.type}
                        onChange={(e) => updateImpact(idx, { type: e.target.value as TriggerImpactType, payload: {} })}
                        className={`flex-1 ${inputCls} ${def.color} border-0 focus:ring-1`}
                      >
                        {IMPACT_DEFS.map((d) => (
                          <option key={d.type} value={d.type}>{d.emoji} {d.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setEditingImpactIdx(editingImpactIdx === idx ? null : idx)}
                        className="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-white/60 transition-colors shrink-0"
                      >
                        {editingImpactIdx === idx ? "▲ Less" : "▼ Config"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImpact(idx)}
                        className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-100 text-gray-300 hover:text-red-400 transition-colors shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {editingImpactIdx === idx && (
                      <ImpactConfig
                        impact={impact}
                        onChange={(u) => updateImpact(idx, u)}
                        allFields={allFields}
                        currentFieldUid={field.uid}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addImpact}
              className="mt-2 flex items-center gap-1 px-2.5 py-1.5 border border-dashed border-indigo-200 rounded-lg text-[10px] text-indigo-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all w-full justify-center"
            >
              <Plus className="w-3 h-3" /> Add Impact
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main TriggerBuilder component ────────────────────────────────────────────────
interface TriggerBuilderProps {
  field: CanvasField;
  allFields: CanvasField[];
  onUpdate: (triggers: Trigger[]) => void;
}

export function TriggerBuilder({ field, allFields, onUpdate }: TriggerBuilderProps) {
  const triggers: Trigger[] = (field as any).triggers ?? [];
  const conditions = FIELD_CONDITIONS[field.typeId] ?? [];
  const canHaveTriggers = conditions.length > 0;

  const addTrigger = () => {
    const defaultCondition = conditions[0]?.condition ?? ("is_empty" as TriggerConditionType);
    const newTrigger: Trigger = {
      id: genTriggerId(),
      event: { condition: defaultCondition },
      impacts: [{ type: "mark_not_ok", payload: {} }],
    };
    onUpdate([...triggers, newTrigger]);
  };

  const updateTrigger = (id: string, updated: Trigger) =>
    onUpdate(triggers.map((t) => t.id === id ? updated : t));

  const deleteTrigger = (id: string) =>
    onUpdate(triggers.filter((t) => t.id !== id));

  // Flat list excluding sections for the target-field dropdowns
  const flatFields: CanvasField[] = allFields.flatMap((f) =>
    f.typeId === "section" ? (f.children ?? []) as CanvasField[] : [f]
  );

  if (!canHaveTriggers) {
    return (
      <div className="flex items-start gap-2 px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl">
        <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400">
          The <strong>{field.typeId}</strong> field type does not support trigger conditions.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-orange-100 flex items-center justify-center">
            <Zap className="w-3 h-3 text-orange-500" />
          </div>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">
            Triggers
            {triggers.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full font-bold">
                {triggers.length}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Info banner */}
      {triggers.length === 0 && (
        <div className="flex items-start gap-2 px-3 py-3 bg-orange-50/40 border border-orange-100 rounded-xl">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Triggers fire automatically when a condition is met during checklist filling.
            Define <strong>When</strong> (the event) and <strong>Then do</strong> (the impact).
          </p>
        </div>
      )}

      {/* Trigger list */}
      {triggers.map((trigger) => (
        <TriggerRow
          key={trigger.id}
          trigger={trigger}
          field={field}
          allFields={flatFields}
          onChange={(updated) => updateTrigger(trigger.id, updated)}
          onDelete={() => deleteTrigger(trigger.id)}
        />
      ))}

      {/* Add trigger button */}
      <button
        type="button"
        onClick={addTrigger}
        className="flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-orange-200 rounded-xl text-xs text-orange-400 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/50 transition-all"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Trigger
      </button>
    </div>
  );
}
