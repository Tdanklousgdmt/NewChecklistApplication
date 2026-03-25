import React, { useState, useRef } from "react";
import {
  X, Tag, MapPin, AlertTriangle, Users, User, BarChart2,
  FileText, Paperclip, Camera, Video, Check, ChevronDown,
  Upload, Trash2, ZoomIn, Play, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { SERVER_URL, buildAuthHeaders } from "../services/checklistService";

// ── Constants ─────────────────────────────────────────────────────────────────

const TAG_TYPES = [
  { id: "maintenance", label: "Maintenance", color: "#ef4444", bgColor: "bg-red-50",   border: "border-red-400",   text: "text-red-600"   },
  { id: "operator",    label: "Operator",    color: "#3b82f6", bgColor: "bg-blue-50",  border: "border-blue-400",  text: "text-blue-600"  },
  { id: "safety",      label: "Safety",      color: "#22c55e", bgColor: "bg-green-50", border: "border-green-400", text: "text-green-600" },
] as const;

const ANOMALIES = [
  "Abnormality",
  "Blocked Anomalies",
  "Broked_12",
  "Excess Tempera",
  "Excess Vibration",
  "Fluid Leak",
  "Corrosion",
  "Noise / Vibration",
  "Overheating",
  "Electrical Fault",
  "Pressure Drop",
  "Contamination",
];

const RESOLUTION_RESPONSIBILITIES = [
  "Electrical",
  "Instrumentation",
  "Mechanical",
  "Myself",
  "Operations",
  "Safety Team",
  "External Contractor",
];

const CRITICALITIES = [
  { id: "critical", label: "CRITICAL", bg: "bg-sky-500",    hover: "hover:bg-sky-600"    },
  { id: "high",     label: "HIGH",     bg: "bg-yellow-400", hover: "hover:bg-yellow-500" },
  { id: "medium",   label: "MEDIUM",   bg: "bg-teal-600",   hover: "hover:bg-teal-700"   },
  { id: "low",      label: "LOW",      bg: "bg-indigo-700", hover: "hover:bg-indigo-800" },
  { id: "very_low", label: "VERY LOW", bg: "bg-lime-500",   hover: "hover:bg-lime-600"   },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

interface MediaAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  mediaType: "image" | "video";
}

interface TagForm {
  tagType: string;
  location: string;
  anomaly: string;
  resolutionResponsibility: string;
  reviewer: string;
  criticality: string;
  observation: string;
  attachments: MediaAttachment[];
}

interface TagDeclarationModalProps {
  checklistId: string;
  checklistTitle: string;
  checklistLocation?: string;
  reviewers?: string[];          // list of reviewer names/emails from checklist
  onClose: () => void;
  onSaved?: (tag: any) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function saveTag(tag: Omit<any, "id">) {
  const res = await fetch(`${SERVER_URL}/tags`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(tag),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.details || err.error || "Failed to save tag");
  }
  return res.json();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SelectDropdown({
  label,
  placeholder,
  options,
  value,
  onChange,
  required,
  error,
}: {
  label: string;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-1" ref={ref}>
      <label className="block text-sm font-semibold text-[#1a3a6b]">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg text-sm transition-colors bg-white ${
            error
              ? "border-red-400 text-red-700"
              : open
              ? "border-[#1a3a6b] ring-1 ring-[#1a3a6b]/30"
              : "border-gray-300 hover:border-[#1a3a6b]/50 text-gray-700"
          }`}
        >
          <span className={value ? "text-gray-800" : "text-gray-400"}>
            {value || placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden max-h-56 overflow-y-auto">
            <div className="py-1">
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    opt === value
                      ? "bg-[#1a3a6b] text-white font-medium"
                      : "text-[#1a3a6b] hover:bg-[#eef2f9]"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TagDeclarationModal({
  checklistId,
  checklistTitle,
  checklistLocation = "",
  reviewers = [],
  onClose,
  onSaved,
}: TagDeclarationModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TagForm>({
    tagType: "",
    location: checklistLocation,
    anomaly: "",
    resolutionResponsibility: "",
    reviewer: "",
    criticality: "",
    observation: "",
    attachments: [],
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof TagForm, string>>>({});

  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  const set = <K extends keyof TagForm>(key: K, value: TagForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  // ── Media attachment ────────────────────────────────────────────────────────
  const processMedia = (file: File) => {
    if (form.attachments.length >= 5) { toast.error("Maximum 5 attachments per tag"); return; }
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) { toast.error("Only images and videos are supported"); return; }
    const maxMB = isVideo ? 50 : 20;
    if (file.size > maxMB * 1024 * 1024) { toast.error(`File too large — max ${maxMB}MB`); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      set("attachments", [
        ...form.attachments,
        { name: file.name, size: file.size, type: file.type, dataUrl, mediaType: isImage ? "image" : "video" },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = (idx: number) => {
    set("attachments", form.attachments.filter((_, i) => i !== idx));
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const errs: Partial<Record<keyof TagForm, string>> = {};
    if (!form.tagType)                  errs.tagType = "Select a tag type";
    if (!form.anomaly)                  errs.anomaly = "Anomaly is required / Select Tag Type";
    if (!form.resolutionResponsibility) errs.resolutionResponsibility = "Resolution responsibility is required";
    if (!form.criticality)              errs.criticality = "Criticality is required";
    if (!form.observation.trim())       errs.observation = "Observation is required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      const result = await saveTag({
        checklistId,
        checklistTitle,
        tagType: form.tagType,
        location: form.location,
        anomaly: form.anomaly,
        resolutionResponsibility: form.resolutionResponsibility,
        reviewer: form.reviewer,
        criticality: form.criticality,
        observation: form.observation,
        attachments: form.attachments,
      });
      toast.success("Tag declared successfully");
      onSaved?.(result.tag);
      onClose();
    } catch (err: any) {
      toast.error(`Failed to save tag: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Selected tag type colors ────────────────────────────────────────────────
  const selectedType = TAG_TYPES.find((t) => t.id === form.tagType);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0d2d6b] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Tag Declaration</h2>
              <p className="text-xs text-blue-200 truncate max-w-[280px]">{checklistTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* ── Step 1: Tag Type ── */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#1a3a6b] uppercase tracking-wide mb-3">
              <span className="w-5 h-5 bg-[#1a3a6b] rounded-full text-white flex items-center justify-center text-[10px] font-bold">1</span>
              Tag Type
              <span className="text-red-500">*</span>
            </h3>
            <div className="flex flex-wrap gap-4">
              {TAG_TYPES.map((t) => {
                const selected = form.tagType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => set("tagType", t.id)}
                    className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                      selected
                        ? `${t.bgColor} ${t.border} ${t.text} shadow-sm`
                        : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
                    }`}
                  >
                    {/* Radio circle */}
                    <span
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                      style={{
                        borderColor: selected ? t.color : "#d1d5db",
                        backgroundColor: selected ? t.color + "20" : "transparent",
                        boxShadow: selected ? `0 0 0 3px ${t.color}30` : "none",
                      }}
                    >
                      {selected && (
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                      )}
                    </span>
                    <span style={{ color: selected ? t.color : undefined }}>{t.label}</span>
                  </button>
                );
              })}
            </div>
            {fieldErrors.tagType && (
              <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />{fieldErrors.tagType}
              </p>
            )}
          </section>

          <div className="border-t border-gray-100" />

          {/* ── Step 2: Location ── */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#1a3a6b] uppercase tracking-wide mb-3">
              <span className="w-5 h-5 bg-[#1a3a6b] rounded-full text-white flex items-center justify-center text-[10px] font-bold">2</span>
              Location
            </h3>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a3a6b]/50" />
              <input
                type="text"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Location from checklist (auto-filled)"
                className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a3a6b] focus:ring-1 focus:ring-[#1a3a6b]/20 bg-[#f0f4fb]"
              />
              {checklistLocation && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#1a3a6b]/60 bg-blue-50 px-2 py-0.5 rounded-full">
                  Auto-filled
                </span>
              )}
            </div>
          </section>

          <div className="border-t border-gray-100" />

          {/* ── Step 3: Anomaly ── */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#1a3a6b] uppercase tracking-wide mb-3">
              <span className="w-5 h-5 bg-[#1a3a6b] rounded-full text-white flex items-center justify-center text-[10px] font-bold">3</span>
              Anomaly
            </h3>
            <SelectDropdown
              label="Anomaly"
              placeholder="Select Anomaly"
              options={ANOMALIES}
              value={form.anomaly}
              onChange={(v) => set("anomaly", v)}
              required
              error={fieldErrors.anomaly}
            />
          </section>

          <div className="border-t border-gray-100" />

          {/* ── Step 4: Resolution Responsibility ── */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#1a3a6b] uppercase tracking-wide mb-3">
              <span className="w-5 h-5 bg-[#1a3a6b] rounded-full text-white flex items-center justify-center text-[10px] font-bold">4</span>
              Resolution Responsibility
            </h3>
            <SelectDropdown
              label="Resolution Responsibility"
              placeholder="Select Resolution Responsibility"
              options={RESOLUTION_RESPONSIBILITIES}
              value={form.resolutionResponsibility}
              onChange={(v) => set("resolutionResponsibility", v)}
              required
              error={fieldErrors.resolutionResponsibility}
            />
          </section>

          <div className="border-t border-gray-100" />

          {/* ── Step 5: Reviewer ── */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#1a3a6b] uppercase tracking-wide mb-3">
              <span className="w-5 h-5 bg-[#1a3a6b] rounded-full text-white flex items-center justify-center text-[10px] font-bold">5</span>
              Reviewer
            </h3>
            {reviewers.length > 0 ? (
              <SelectDropdown
                label="Reviewer"
                placeholder="Select Reviewer"
                options={reviewers}
                value={form.reviewer}
                onChange={(v) => set("reviewer", v)}
              />
            ) : (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a3a6b]/50" />
                <input
                  type="text"
                  value={form.reviewer}
                  onChange={(e) => set("reviewer", e.target.value)}
                  placeholder="Enter reviewer name or email"
                  className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a3a6b] focus:ring-1 focus:ring-[#1a3a6b]/20"
                />
              </div>
            )}
          </section>

          <div className="border-t border-gray-100" />

          {/* ── Step 6: Criticality ── */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#1a3a6b] uppercase tracking-wide mb-3">
              <span className="w-5 h-5 bg-[#1a3a6b] rounded-full text-white flex items-center justify-center text-[10px] font-bold">6</span>
              Criticality
              <span className="text-red-500">*</span>
            </h3>
            <div className="flex flex-wrap gap-0 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              {CRITICALITIES.map((c, i) => {
                const selected = form.criticality === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => set("criticality", c.id)}
                    className={`flex-1 min-w-[70px] px-3 py-3 text-xs font-bold text-white transition-all ${c.bg} ${c.hover} ${
                      selected ? "ring-2 ring-inset ring-white/60 scale-y-105 relative z-10 shadow-lg" : "opacity-80"
                    } ${i > 0 ? "border-l border-white/20" : ""}`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            {fieldErrors.criticality && (
              <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />{fieldErrors.criticality}
              </p>
            )}
          </section>

          <div className="border-t border-gray-100" />

          {/* ── Step 7: Observation ── */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#1a3a6b] uppercase tracking-wide mb-3">
              <span className="w-5 h-5 bg-[#1a3a6b] rounded-full text-white flex items-center justify-center text-[10px] font-bold">7</span>
              Observation
              <span className="text-red-500">*</span>
            </h3>
            <div>
              <textarea
                value={form.observation}
                onChange={(e) => set("observation", e.target.value)}
                placeholder="Enter Observation"
                maxLength={2500}
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-1 transition-colors ${
                  fieldErrors.observation
                    ? "border-red-400 focus:border-red-400 focus:ring-red-200"
                    : "border-[#1a3a6b]/40 focus:border-[#1a3a6b] focus:ring-[#1a3a6b]/20"
                }`}
              />
              <div className="flex items-center justify-between mt-1">
                {fieldErrors.observation
                  ? <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{fieldErrors.observation}</p>
                  : <span />
                }
                <span className="text-[11px] text-gray-400 ml-auto">{form.observation.length} / 2500</span>
              </div>
            </div>
          </section>

          <div className="border-t border-gray-100" />

          {/* ── Step 8: Attachments ── */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#1a3a6b] uppercase tracking-wide mb-3">
              <span className="w-5 h-5 bg-[#1a3a6b] rounded-full text-white flex items-center justify-center text-[10px] font-bold">8</span>
              Attach Image / Video
            </h3>

            {/* Preview grid */}
            {form.attachments.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {form.attachments.map((att, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video">
                    {att.mediaType === "image" ? (
                      <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900/90 gap-1">
                        <Play className="w-7 h-7 text-white/80" />
                        <span className="text-[10px] text-white/60 truncate px-2 max-w-full">{att.name}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-black/60 text-[9px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {att.name}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Attach buttons row */}
            <div className="flex items-center gap-3 px-4 py-3 border-2 border-[#1a3a6b]/20 rounded-xl bg-[#f5f8ff]">
              <span className="text-sm text-gray-600 flex-1">Attach Image / Video:</span>
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                title="Take photo"
                className="w-10 h-10 bg-[#1a3a6b] hover:bg-[#0d2d6b] text-white rounded-lg flex items-center justify-center transition-colors shadow-sm"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                title="Attach file"
                className="w-10 h-10 bg-[#1a3a6b] hover:bg-[#0d2d6b] text-white rounded-lg flex items-center justify-center transition-colors shadow-sm"
              >
                <span className="text-lg font-bold leading-none">+</span>
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Up to 5 attachments · Images: JPG, PNG (max 20MB) · Videos: MP4, MOV (max 50MB)
            </p>

            {/* Hidden inputs */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processMedia(f); e.target.value = ""; }}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processMedia(f); e.target.value = ""; }}
            />
          </section>

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-center gap-4 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2.5 border-2 border-[#1a3a6b] text-[#1a3a6b] rounded-lg text-sm font-semibold hover:bg-[#1a3a6b]/5 transition-colors"
          >
            <X className="w-4 h-4" /> CANCEL
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-2.5 bg-[#1a3a6b] hover:bg-[#0d2d6b] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              <><Check className="w-4 h-4" /> SAVE</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
