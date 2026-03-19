import { useState } from "react";
import React from "react";
import { CanvasField } from "./ChecklistStep2";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Copy,
  Star,
  Camera,
  Calendar,
  Clock,
  Hash,
  CheckSquare2,
  ToggleLeft,
  ListFilter,
  AlignLeft,
  Type,
  Heading1,
  Info,
  SeparatorHorizontal,
  PenLine,
  Paperclip,
  MapPin,
  Thermometer,
  ScanLine,
  CalendarClock,
  Video,
  Calculator,
  Upload,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Users,
  Tag,
  Flag,
  AlertTriangle,
  TrendingUp,
  Circle,
  Repeat,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  ListChecks,
  Shield,
  Film,
} from "lucide-react";

interface ChecklistStep3Props {
  onBack?: () => void;
  onPublish?: () => void;
  canvasFields: CanvasField[];
  metadata?: {
    title?: string;
    category?: string;
    priority?: string;
    validFrom?: string;
    validTo?: string;
    frequency?: string;
    assignedTo?: string;
    location?: string;
    validateChecklist?: boolean;
    managerName?: string;
  };
}

// Collapsible Section Component
function CollapsibleSection({ field, children }: { field: CanvasField; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(!field.isCollapsed);
  const isHorizontal = field.layout === "horizontal";
  const childArray = React.Children.toArray(children);

  return (
    <div className="border-2 border-amber-200 rounded-xl overflow-hidden bg-amber-50/30">
      {/* Section Header - Clickable */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-100/50 to-transparent hover:from-amber-100 transition-colors"
      >
        <Heading1 className="w-5 h-5 text-amber-600 shrink-0" />
        <h2 className="flex-1 text-left text-gray-800 tracking-tight">{field.content || field.label}</h2>
        <div className="flex items-center gap-2 shrink-0">
          {/* Layout badge */}
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${isHorizontal ? "bg-amber-300 text-amber-800" : "bg-amber-200 text-amber-700"}`}>
            {isHorizontal ? "⇔ Horizontal" : "↕ Vertical"}
          </span>
          {childArray.length > 0 && (
            <span className="px-2 py-0.5 bg-amber-200 text-amber-700 rounded-full text-[10px]">
              {childArray.length} field{childArray.length !== 1 ? 's' : ''}
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-amber-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-amber-600" />
          )}
        </div>
      </button>

      {/* Section Body - Collapsible */}
      {isOpen && childArray.length > 0 && (
        <div className="px-4 py-4 bg-white/50 border-t border-amber-200">
          {isHorizontal ? (
            /* Side-by-side for horizontal layout */
            <div className="grid grid-cols-2 gap-4">
              {childArray.map((child, i) => (
                <div key={i}>{child}</div>
              ))}
            </div>
          ) : (
            /* Stacked for vertical layout */
            <div className="flex flex-col gap-4">
              {children}
            </div>
          )}
        </div>
      )}
      {isOpen && childArray.length === 0 && (
        <div className="px-4 py-4 bg-white/50 border-t border-amber-200">
          <p className="text-xs text-gray-400 py-2 text-center">No fields in this section</p>
        </div>
      )}
    </div>
  );
}

export function ChecklistStep3({ onBack, onPublish, canvasFields, metadata = {} }: ChecklistStep3Props) {
  const [published, setPublished] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "preview">("summary");

  // Use real metadata from Step 1, with safe fallbacks
  const meta = {
    title: metadata.title || "",
    category: metadata.category || "",
    priority: (metadata.priority || "normal") as "urgent" | "high" | "normal" | "low",
    validFrom: metadata.validFrom || "",
    validTo: metadata.validTo || "",
    frequency: metadata.frequency || "",
    assignedTo: metadata.assignedTo || "",
    location: metadata.location || "",
    validateChecklist: metadata.validateChecklist ?? false,
    managerName: metadata.managerName || "",
  };

  const priorityConfig = {
    urgent: { label: "Urgent", color: "text-red-600", bg: "bg-red-50", border: "border-red-500", icon: <AlertTriangle className="w-4 h-4" /> },
    high: { label: "High", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-400", icon: <Flag className="w-4 h-4" /> },
    normal: { label: "Normal", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-400", icon: <TrendingUp className="w-4 h-4" /> },
    low: { label: "Low", color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-300", icon: <Circle className="w-4 h-4" /> },
  };

  // Validation checks
  const validationIssues: { type: string; message: string }[] = [];
  const requiredFieldsCount = canvasFields.filter(f => f.required).length;
  
  if (!meta.title) validationIssues.push({ type: "error", message: "Checklist title is required" });
  if (!meta.category) validationIssues.push({ type: "error", message: "Category is required" });
  if (!meta.assignedTo) validationIssues.push({ type: "error", message: "Assignment is required" });
  if (!meta.location) validationIssues.push({ type: "error", message: "Location is required" });
  if (canvasFields.length === 0) validationIssues.push({ type: "error", message: "No fields added to checklist" });
  if (requiredFieldsCount === 0 && canvasFields.length > 0) validationIssues.push({ type: "warning", message: "No required fields — consider making some fields mandatory" });
  
  // Date validation
  if (meta.validFrom && meta.validTo) {
    const from = new Date(meta.validFrom);
    const to = new Date(meta.validTo);
    if (from > to) {
      validationIssues.push({ type: "error", message: "Valid From date must be before Valid To date" });
    }
  }

  const hasErrors = validationIssues.some(issue => issue.type === "error");
  const hasWarnings = validationIssues.some(issue => issue.type === "warning");

  const handlePublish = () => {
    if (hasErrors) return;
    setPublished(true);
    // Simulate publishing
    setTimeout(() => {
      if (onPublish) {
        onPublish();
      }
    }, 1200);
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] transition-all";

  // ── Reusable field preview renderer ──────────────────────────────────────────
  const renderPreviewField = (f: CanvasField) => {
    // Instruction
    if (f.typeId === "instruction") {
      return (
        <div key={f.uid} className="flex gap-3 px-4 py-3 bg-sky-50 border border-sky-100 rounded-xl">
          <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-sky-700">{f.content || f.label}</p>
          </div>
        </div>
      );
    }
    // Separator
    if (f.typeId === "separator") {
      return (
        <div key={f.uid} className="py-2">
          <div className="border-t border-gray-200" />
        </div>
      );
    }
    // Section nested inside another section (render flat)
    if (f.typeId === "section") {
      return (
        <div key={f.uid} className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700">
          {f.label || "Section"}
        </div>
      );
    }

    // All answerable field types
    return (
      <div key={f.uid} className="flex flex-col gap-2">
        <label className="flex items-center gap-1.5 text-sm text-gray-700">
          {f.label || "Untitled Field"}
          {f.required && <span className="text-[#2abaad]">*</span>}
        </label>
        {f.helpText && <p className="text-xs text-gray-400 -mt-1">{f.helpText}</p>}

        {f.typeId === "short_text" && (
          <input type="text" placeholder={f.placeholder || "Enter text..."} className={inputClass} disabled />
        )}
        {f.typeId === "long_text" && (
          <textarea placeholder={f.placeholder || "Enter text..."} rows={f.rows || 3} className={inputClass} disabled />
        )}
        {f.typeId === "number" && (
          <input type="number" placeholder={f.placeholder || "Enter number..."} min={f.minValue} max={f.maxValue} step={f.step || 1} className={inputClass} disabled />
        )}
        {(f.typeId === "number_unit" || f.typeId === "number_threshold") && (
          <input type="number" placeholder="Enter value..." className={inputClass} disabled />
        )}
        {f.typeId === "checkbox" && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg">
            <input type="checkbox" className="w-4 h-4 text-[#2abaad] border-gray-300 rounded focus:ring-[#2abaad]" disabled />
            <span className="text-sm text-gray-600">Check to confirm</span>
          </div>
        )}
        {f.typeId === "yes_no" && (
          <div className="flex gap-3">
            <button type="button" className="flex-1 px-4 py-2.5 rounded-lg border-2 border-gray-200 text-sm text-gray-600 disabled:opacity-50" disabled>
              <div className="flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Yes</div>
            </button>
            <button type="button" className="flex-1 px-4 py-2.5 rounded-lg border-2 border-gray-200 text-sm text-gray-600 disabled:opacity-50" disabled>No</button>
          </div>
        )}
        {f.typeId === "custom_buttons" && (
          <div className="flex flex-wrap gap-2">
            {(f.customButtons || []).map((btn: any) => (
              <button key={btn.id} type="button" className="px-4 py-2 rounded-lg border-2 border-gray-200 text-sm disabled:opacity-50" disabled>{btn.label}</button>
            ))}
          </div>
        )}
        {f.typeId === "dropdown" && (
          <select className={inputClass} disabled>
            <option>Select an option...</option>
            {(f.options || []).map((opt, idx) => <option key={idx} value={opt}>{opt || `Option ${idx + 1}`}</option>)}
          </select>
        )}
        {f.typeId === "date" && (
          <div className="relative">
            <input type="date" className={`${inputClass} pr-10`} disabled />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
          </div>
        )}
        {f.typeId === "time" && (
          <div className="relative">
            <input type="time" className={`${inputClass} pr-10`} disabled />
            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
          </div>
        )}
        {f.typeId === "datetime" && (
          <div className="relative">
            <input type="datetime-local" className={`${inputClass} pr-10`} disabled />
            <CalendarClock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
          </div>
        )}
        {f.typeId === "photo" && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50">
            <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Click to capture or upload photo</p>
          </div>
        )}
        {f.typeId === "video" && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50">
            <Video className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Click to record or upload video</p>
          </div>
        )}
        {f.typeId === "media_embed" && (
          <div className="space-y-2">
            {/* Show creator's embedded reference media if present */}
            {f.embeddedMediaData ? (
              <div className="rounded-xl overflow-hidden border-2 border-violet-200 bg-violet-50/40">
                <div className="flex items-center gap-2 px-3 py-2 bg-violet-100/60 border-b border-violet-200">
                  <span className="text-[10px] font-semibold text-violet-700 uppercase tracking-wide">Reference Example</span>
                  <span className="text-[10px] text-violet-400 ml-auto">{f.embeddedMediaData.name}</span>
                </div>
                {f.embeddedMediaData.mediaType === "image" ? (
                  <img
                    src={f.embeddedMediaData.dataUrl}
                    alt={f.embeddedMediaData.name}
                    className="w-full max-h-48 object-contain bg-white"
                  />
                ) : (
                  <video
                    src={f.embeddedMediaData.dataUrl}
                    controls
                    className="w-full max-h-48 bg-black"
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/20">
                <Film className="w-6 h-6 text-violet-300" />
                <p className="text-xs text-violet-400 font-medium">No reference media attached</p>
              </div>
            )}
          </div>
        )}
        {f.typeId === "signature" && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50">
            <PenLine className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Click to sign</p>
          </div>
        )}
        {f.typeId === "file" && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50">
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Click to upload file</p>
          </div>
        )}
        {f.typeId === "rating" && (
          <div className="flex gap-2">
            {f.ratingStyle === "numeric"
              ? Array.from({ length: f.maxRating || 5 }).map((_, i) => (
                  <button key={i} type="button" className="w-10 h-10 rounded-lg border-2 border-gray-200 text-sm text-gray-400 disabled:opacity-50" disabled>{i + 1}</button>
                ))
              : Array.from({ length: f.maxRating || 5 }).map((_, i) => (
                  <button key={i} type="button" className="text-gray-300 disabled:opacity-50" disabled><Star className="w-7 h-7" /></button>
                ))}
          </div>
        )}
        {f.typeId === "location" && (
          <div className="relative">
            <input type="text" placeholder="Capture location or enter address..." className={`${inputClass} pr-10`} disabled />
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
          </div>
        )}
        {f.typeId === "temperature" && (
          <div className="relative">
            <input type="number" placeholder={`Enter temperature in ${f.unit === "fahrenheit" ? "°F" : "°C"}...`} className={`${inputClass} pr-16`} disabled />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
              <Thermometer className="w-4 h-4 text-gray-300" />
              <span className="text-xs text-gray-400">{f.unit === "fahrenheit" ? "°F" : "°C"}</span>
            </div>
          </div>
        )}
        {f.typeId === "barcode" && (
          <div className="relative">
            <input type="text" placeholder="Scan or enter code..." className={`${inputClass} pr-10`} disabled />
            <ScanLine className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
          </div>
        )}
        {f.typeId === "formula" && (
          <div className="relative">
            <input type="text" placeholder="Calculated value will appear here..." className={`${inputClass} pr-10 bg-gray-50`} disabled readOnly />
            <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
          </div>
        )}
      </div>
    );
  };

  // ─── MOBILE LAYOUT ───────────────────────────────────────────────
  const mobileLayout = (
    <div className="block sm:hidden min-h-screen bg-gray-50 flex flex-col">

      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <button type="button" onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 active:bg-gray-200 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">Preview & Publish</p>
            <p className="text-[11px] text-gray-400">Step 3 of 3</p>
          </div>
          <div className="w-9 h-9" />
        </div>
        {/* Full progress bar */}
        <div className="flex gap-1.5 px-4 pb-3">
          <div className="flex-1 h-1 rounded-full bg-[#2abaad]" />
          <div className="flex-1 h-1 rounded-full bg-[#2abaad]" />
          <div className="flex-1 h-1 rounded-full bg-[#2abaad]" />
        </div>
        {/* Tab switcher */}
        <div className="flex px-4 pb-3 gap-2">
          <button type="button" onClick={() => setActiveTab("summary")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === "summary" ? "bg-[#2abaad] text-white shadow-sm" : "bg-gray-100 text-gray-500"}`}>
            <FileText className="w-3.5 h-3.5" /> Summary
          </button>
          <button type="button" onClick={() => setActiveTab("preview")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === "preview" ? "bg-[#2abaad] text-white shadow-sm" : "bg-gray-100 text-gray-500"}`}>
            <Eye className="w-3.5 h-3.5" /> Preview
            {canvasFields.length > 0 && (
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeTab === "preview" ? "bg-white/30 text-white" : "bg-gray-200 text-gray-500"}`}>
                {canvasFields.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── SUMMARY TAB ── */}
      {activeTab === "summary" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-36 space-y-3">

          {/* Validation banner */}
          {validationIssues.length > 0 && (
            <div className={`rounded-2xl border-2 p-4 ${hasErrors ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
              <div className="flex items-center gap-2 mb-2.5">
                {hasErrors ? <XCircle className="w-4 h-4 text-red-500 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                <p className={`text-xs font-semibold ${hasErrors ? "text-red-700" : "text-amber-700"}`}>
                  {hasErrors ? "Fix issues before publishing" : "Review before publishing"}
                </p>
              </div>
              <ul className="flex flex-col gap-2">
                {validationIssues.map((issue, i) => (
                  <li key={i} className={`text-xs flex items-start gap-1.5 ${issue.type === "error" ? "text-red-600" : "text-amber-600"}`}>
                    {issue.type === "error" ? <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ready banner */}
          {!hasErrors && canvasFields.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3.5 bg-green-50 border border-green-200 rounded-2xl">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-700">Ready to publish</p>
                <p className="text-xs text-green-500">All required fields are complete</p>
              </div>
            </div>
          )}

          {/* Title card */}
          {meta.title && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Checklist</p>
              <p className="text-base font-bold text-gray-800">{meta.title}</p>
              {meta.category && (
                <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 bg-teal-50 border border-teal-200 rounded-full text-xs text-teal-700">
                  <Tag className="w-2.5 h-2.5" /> {meta.category}
                </span>
              )}
            </div>
          )}

          {/* Priority + Frequency */}
          {(meta.priority || meta.frequency) && (
            <div className="grid grid-cols-2 gap-3">
              {meta.priority && (() => {
                const pc = priorityConfig[meta.priority as keyof typeof priorityConfig];
                return (
                  <div className={`rounded-2xl border-2 px-4 py-3.5 ${pc?.border || "border-gray-200"} ${pc?.bg || "bg-gray-50"}`}>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Priority</p>
                    <div className={`flex items-center gap-2 ${pc?.color || "text-gray-600"}`}>
                      {pc?.icon}
                      <span className="text-sm font-semibold">{pc?.label || meta.priority}</span>
                    </div>
                  </div>
                );
              })()}
              {meta.frequency && (
                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm px-4 py-3.5">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Frequency</p>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Repeat className="w-4 h-4 text-[#2abaad]" />
                    <span className="text-sm font-semibold">
                      {meta.frequency === "ONE_OFF" || meta.frequency === "ONE_TIME" ? "One-time"
                        : meta.frequency === "PERMANENT" ? "Permanent"
                        : meta.frequency === "RECURRING" ? "Recurring"
                        : meta.frequency}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dates */}
          {(meta.validFrom || meta.validTo) && (
            <div className="grid grid-cols-2 gap-3">
              {meta.validFrom && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Valid From</p>
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Calendar className="w-3.5 h-3.5 text-[#2abaad] shrink-0" />
                    <span className="text-sm font-semibold">{meta.validFrom}</span>
                  </div>
                </div>
              )}
              {meta.validTo && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Valid To</p>
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Calendar className="w-3.5 h-3.5 text-[#2abaad] shrink-0" />
                    <span className="text-sm font-semibold">{meta.validTo}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Assigned To */}
          {meta.assignedTo && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-[#2abaad]" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Assigned To</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{meta.assignedTo}</p>
              </div>
            </div>
          )}

          {/* Location */}
          {meta.location && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-[#2abaad]" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Location</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{meta.location}</p>
              </div>
            </div>
          )}

          {/* Validation setting */}
          {meta.validateChecklist && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-green-500" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Validation</p>
                <p className="text-sm font-semibold text-gray-800">Required{meta.managerName ? ` · ${meta.managerName}` : ""}</p>
              </div>
            </div>
          )}

          {/* Field stats */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-3">Fields</p>
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-gray-800">{canvasFields.length}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Total</p>
              </div>
              <div className="w-px h-10 bg-gray-100" />
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-[#2abaad]">{requiredFieldsCount}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Required</p>
              </div>
              <div className="w-px h-10 bg-gray-100" />
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-gray-400">{canvasFields.length - requiredFieldsCount}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Optional</p>
              </div>
            </div>
            {canvasFields.length > 0 && (
              <button type="button" onClick={() => setActiveTab("preview")}
                className="w-full mt-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-[#2abaad] font-semibold flex items-center justify-center gap-1.5 active:bg-gray-100">
                <Eye className="w-3.5 h-3.5" /> View field preview
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── PREVIEW TAB ── */}
      {activeTab === "preview" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-36">
          {canvasFields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400 mb-3">No fields to preview</p>
              <button type="button" onClick={onBack} className="px-4 py-2 rounded-xl border border-[#2abaad] text-[#2abaad] text-xs font-medium">← Go back and add fields</button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4 text-[#2abaad]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700">Field Preview</p>
                  <p className="text-[10px] text-gray-400">How it will appear to users</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-4 border-b border-gray-50 bg-gradient-to-r from-teal-50/60 to-transparent">
                  <p className="text-base font-bold text-gray-800">{meta.title || "Untitled Checklist"}</p>
                  {meta.category && <p className="text-xs text-gray-400 mt-0.5">{meta.category}</p>}
                </div>
                <div className="px-5 py-5 flex flex-col gap-5">
                  {canvasFields.map((field) => (
                    <div key={field.uid}>
                      {field.typeId === "section" ? (
                        <CollapsibleSection field={field}>
                          {(field.children || []).length === 0
                            ? <p className="text-xs text-gray-400 py-2 text-center">No fields in this section</p>
                            : (field.children || []).map((child) => renderPreviewField(child))}
                        </CollapsibleSection>
                      ) : renderPreviewField(field)}
                    </div>
                  ))}
                </div>
                <div className="px-5 py-4 border-t border-gray-50 bg-gray-50/50">
                  <p className="text-[10px] text-gray-400 text-center">Fields marked with <span className="text-[#2abaad]">*</span> are required</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 px-4 py-3 shadow-lg">
        {hasErrors && (
          <p className="text-[10px] text-red-500 text-center mb-2 flex items-center justify-center gap-1">
            <AlertCircle className="w-3 h-3" /> Fix the issues above before publishing
          </p>
        )}
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-100 active:bg-gray-200 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button type="button" className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600 bg-white active:bg-gray-50 transition-colors">
            Save Draft
          </button>
          <button type="button" onClick={handlePublish} disabled={hasErrors || canvasFields.length === 0 || published}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-sm font-semibold transition-all shadow-md disabled:opacity-40 disabled:shadow-none ${published ? "bg-green-500 shadow-green-200" : "bg-[#2abaad] active:bg-[#24a699] shadow-teal-200"}`}>
            {published ? <><CheckCircle2 className="w-4 h-4" /> Published!</> : <><Upload className="w-4 h-4" /> Publish</>}
          </button>
        </div>
      </div>
    </div>
  );

  // ─── DESKTOP LAYOUT ──────────────────────────────────────────────
  return (
    <>
      {mobileLayout}
      <div className="hidden sm:flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#2abaad] tracking-wide uppercase text-xs">
            Checklist Master
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-gray-700 tracking-wide uppercase text-xs">
            New Checklist
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-gray-400 tracking-wide uppercase text-xs">
            Preview & Publish
          </span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs transition-all ${
                  step === 1 || step === 2
                    ? "bg-teal-50 text-[#2abaad] ring-2 ring-teal-100"
                    : step === 3
                    ? "bg-[#2abaad] text-white shadow-md shadow-teal-200"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {step === 1 || step === 2 ? <CheckCircle2 className="w-4 h-4" /> : step}
              </div>
              {step < 3 && <div className={`w-8 h-px ${step < 3 ? "bg-[#2abaad]" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#2abaad] text-[#2abaad] rounded-xl text-xs tracking-wide hover:bg-teal-50 transition-colors duration-150 shadow-sm"
        >
          <Copy className="w-3.5 h-3.5" />
          Copy From
        </button>
      </header>

      <div className="flex-1 flex items-start justify-center p-6 lg:p-10 overflow-y-auto">
        <div className="w-full max-w-3xl flex flex-col gap-4">

          {/* Validation summary — show only if there are issues */}
          {validationIssues.length > 0 && (
            <div className={`rounded-2xl border-2 p-4 ${hasErrors ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                {hasErrors
                  ? <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                <p className={`text-sm font-semibold ${hasErrors ? "text-red-700" : "text-amber-700"}`}>
                  {hasErrors ? "Fix the following issues before publishing" : "Review before publishing"}
                </p>
              </div>
              <ul className="flex flex-col gap-1.5 ml-6">
                {validationIssues.map((issue, i) => (
                  <li key={i} className={`text-xs flex items-center gap-1.5 ${issue.type === "error" ? "text-red-600" : "text-amber-600"}`}>
                    {issue.type === "error"
                      ? <XCircle className="w-3 h-3 shrink-0" />
                      : <AlertTriangle className="w-3 h-3 shrink-0" />}
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Metadata summary card */}
          {(meta.title || meta.category || meta.assignedTo || meta.location) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-3">Checklist Summary</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {meta.title && (
                  <div className="col-span-2 flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400">Title</p>
                      <p className="text-sm font-semibold text-gray-800">{meta.title}</p>
                    </div>
                  </div>
                )}
                {meta.category && (
                  <div className="flex items-start gap-2">
                    <Tag className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400">Category</p>
                      <p className="text-sm text-gray-700">{meta.category}</p>
                    </div>
                  </div>
                )}
                {meta.priority && (
                  <div className="flex items-start gap-2">
                    {priorityConfig[meta.priority as keyof typeof priorityConfig]?.icon || <Flag className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />}
                    <div>
                      <p className="text-[10px] text-gray-400">Priority</p>
                      <p className={`text-sm font-medium ${priorityConfig[meta.priority as keyof typeof priorityConfig]?.color || "text-gray-700"}`}>
                        {priorityConfig[meta.priority as keyof typeof priorityConfig]?.label || meta.priority}
                      </p>
                    </div>
                  </div>
                )}
                {meta.assignedTo && (
                  <div className="flex items-start gap-2">
                    <Users className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400">Assigned To</p>
                      <p className="text-sm text-gray-700">{meta.assignedTo}</p>
                    </div>
                  </div>
                )}
                {meta.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400">Location</p>
                      <p className="text-sm text-gray-700">{meta.location}</p>
                    </div>
                  </div>
                )}
                {meta.frequency && (
                  <div className="flex items-start gap-2">
                    <Repeat className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400">Frequency</p>
                      <p className="text-sm text-gray-700">
                        {meta.frequency === "ONE_OFF" || meta.frequency === "ONE_TIME" ? "One-time" : meta.frequency === "PERMANENT" ? "Permanent" : meta.frequency === "RECURRING" ? "Recurring" : meta.frequency}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {/* Field count badge */}
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5 text-[#2abaad]" /> {canvasFields.length} field{canvasFields.length !== 1 ? "s" : ""} total</span>
                <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-[#2abaad]" /> {requiredFieldsCount} required</span>
                {meta.validateChecklist && <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Validation required</span>}
              </div>
            </div>
          )}

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Card header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-50 bg-gradient-to-r from-teal-500/5 to-transparent">
              <h1 className="text-gray-800 tracking-tight">Checklist Preview</h1>
              <p className="text-xs text-gray-400 mt-0.5">Step 3 of 3 — Review your checklist before publishing</p>
            </div>

            {/* Form preview */}
            <div className="px-6 py-6">
              {canvasFields.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">No fields added to the checklist yet.</p>
                  <button
                    onClick={onBack}
                    className="mt-4 px-4 py-2 text-xs text-[#2abaad] border border-[#2abaad] rounded-xl hover:bg-teal-50 transition-colors"
                  >
                    ← Go back and add fields
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {canvasFields.map((field) => (
                    <div key={field.uid}>
                      {/* Section */}
                      {field.typeId === "section" && (
                        <CollapsibleSection field={field}>
                          {(field.children || []).length === 0 ? (
                            <p className="text-xs text-gray-400 py-2 text-center">No fields in this section</p>
                          ) : (
                            (field.children || []).map((child) => renderPreviewField(child))
                          )}
                        </CollapsibleSection>
                      )}

                      {/* All non-section field types */}
                      {field.typeId !== "section" && renderPreviewField(field)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back to Edit
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={hasErrors || canvasFields.length === 0 || published}
                  className={`px-6 py-2.5 rounded-xl text-white text-sm transition-all shadow-lg flex items-center gap-2 ${
                    published
                      ? "bg-green-500 shadow-green-200"
                      : "bg-[#2abaad] hover:bg-[#24a699] shadow-teal-200 hover:shadow-xl"
                  } disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none`}
                >
                  {published ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Published!
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Publish Checklist
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-300 mt-0">
            Fields marked with <span className="text-[#2abaad]">*</span> are required
          </p>
        </div>
      </div>
      </div>
    </>
  );
}